/**
 * Atiende un mensaje entrante de WhatsApp (cualquier canal):
 *   1. Busca al alumno por el hash de su teléfono.
 *   2. Si no está vinculado, le pide su código y lo vincula.
 *   3. Muestra "escribiendo…", descarga el audio si hay, llama al motor.
 *   4. Manda una burbuja por mensaje; la última con botones si los hay.
 */
import type { Repositorio } from '@/db/repositorio';
import { pasoActual } from '@/motor/maquina';
import { procesar, type DependenciasMotor } from '@/motor/procesar';
import type { EntradaAlumno } from '@/motor/tipos';
import type { Canal, MensajeEntrante } from './tipos';

export interface DependenciasAtender {
  canal: Canal;
  motor: DependenciasMotor;
  hashTelefono: (tel: string) => string;
  cifrarTelefono: (tel: string) => string;
  ahora?: () => Date;
}

export const RE_CODIGO = /\bPEPE-[A-Z0-9]{1,6}-[A-Z0-9]{1,6}\b/i;

export const MENSAJES_VINCULACION = {
  pedirCodigo: [
    '¡Qué onda! Soy Pepe 🦎, tu compa que siempre se equivoca.',
    'Pásame el código que te dio tu profe, por ejemplo PEPE-1B-07.',
  ],
  codigoNoExiste: (codigo: string) => [`Mmm, no encontré el código ${codigo} 🤔 Revísalo con tu profe y me lo vuelves a mandar.`],
  codigoOcupado: ['Ese código ya está conectado a otro número 😅 Pídele ayuda a tu profe.'],
  bienvenida: (nombre: string) => `¡Listo, ${nombre}! Ya quedamos conectados 🙌`,
  error: ['Uy, se me trabó algo 😅 ¿Me lo repites en un ratito?'],
  noSoportado: ['Uy, eso no lo puedo ver 🙈 Escríbeme o mándame una nota de voz.'],
};

/** Límite de WhatsApp para el texto de un mensaje con botones. */
export const MAX_TEXTO_CON_BOTONES = 1024;
const MAX_TEXTO = 4096;

/**
 * Junta las burbujas de Pepe en un solo mensaje de WhatsApp. Meta cobra cada
 * mensaje enviado (servicio, en México ~US$0.0085 desde oct-2026), así que una
 * respuesta de 3 burbujas cuesta lo mismo que una. Si con botones el texto
 * pasa del límite, la última burbuja va aparte con sus botones.
 */
export function agruparParaWhatsApp(mensajes: string[], botones?: string[]): { texto: string; botones?: string[] }[] {
  const limpios = mensajes.map((m) => m.trim()).filter(Boolean);
  if (limpios.length === 0) return [];
  const conBotones = Boolean(botones && botones.length > 0);
  const todo = limpios.join('\n\n');
  if (!conBotones) {
    if (todo.length <= MAX_TEXTO) return [{ texto: todo }];
    return limpios.map((texto) => ({ texto }));
  }
  if (todo.length <= MAX_TEXTO_CON_BOTONES) return [{ texto: todo, botones }];
  const ultimo = limpios.at(-1)!;
  const antes = limpios.slice(0, -1).join('\n\n');
  return [...(antes ? [{ texto: antes }] : []), { texto: ultimo, botones }];
}

async function mandar(canal: Canal, destino: string, mensajes: string[], botones?: string[]) {
  for (const m of agruparParaWhatsApp(mensajes, botones)) {
    if (m.botones) await canal.enviarBotones(destino, m.texto, m.botones);
    else await canal.enviarTexto(destino, m.texto);
  }
}

async function vincular(
  deps: DependenciasAtender,
  repo: Repositorio,
  m: MensajeEntrante,
  telHash: string,
): Promise<{ alumnoId: string; nombre: string } | null> {
  const texto = m.tipo === 'texto' || m.tipo === 'boton' ? m.texto : '';
  const codigo = texto.toUpperCase().match(RE_CODIGO)?.[0];
  if (!codigo) {
    await mandar(deps.canal, m.de, MENSAJES_VINCULACION.pedirCodigo);
    return null;
  }
  const alumno = await repo.alumnoPorCodigo(codigo);
  if (!alumno) {
    await mandar(deps.canal, m.de, MENSAJES_VINCULACION.codigoNoExiste(codigo));
    return null;
  }
  if (alumno.tel_hash && alumno.tel_hash !== telHash) {
    await mandar(deps.canal, m.de, MENSAJES_VINCULACION.codigoOcupado);
    return null;
  }
  await repo.vincularTelefono(alumno.id, telHash, deps.cifrarTelefono(m.de));
  return { alumnoId: alumno.id, nombre: alumno.nombre.split(' ')[0] ?? alumno.nombre };
}

/** Para los logs: nunca imprimir números de teléfono. */
export function enmascarar(err: unknown): string {
  const texto = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  return texto.replace(/\+?\d[\d\s-]{7,}\d/g, '[tel]');
}

export async function atenderMensaje(deps: DependenciasAtender, m: MensajeEntrante): Promise<void> {
  const { canal } = deps;
  const repo = deps.motor.repo;
  try {
    if (await repo.existeMensajeExterno(m.id_externo)) return;

    const telHash = deps.hashTelefono(m.de);
    let alumno = await repo.alumnoPorTelHash(telHash);
    let saludo: string | null = null;
    if (!alumno) {
      const v = await vincular(deps, repo, m, telHash);
      if (!v) return;
      alumno = await repo.alumnoPorId(v.alumnoId);
      if (!alumno) return;
      saludo = MENSAJES_VINCULACION.bienvenida(v.nombre);
    }

    await repo.marcarMensajeWhatsApp(alumno.id, deps.ahora?.() ?? new Date());
    await canal.indicarEscribiendo?.(m.de, m.id_externo).catch(() => undefined);

    // Recién vinculado con un reto ya en curso (p. ej. empezó en la web): no se
    // evalúa nada; Pepe solo repite su última pregunta.
    if (saludo) {
      const activa = await repo.sesionActiva(alumno.id);
      if (activa && activa.fase !== 'pendiente') {
        const turnos = await repo.ultimosTurnos(activa.id, 10);
        const ultimas: string[] = [];
        for (let i = turnos.length - 1; i >= 0 && turnos[i]!.rol === 'pepe'; i--) ultimas.unshift(turnos[i]!.texto);
        const reto = deps.motor.banco.find((r) => r.id === activa.reto_id);
        const botones = reto ? pasoActual(reto, activa)?.botones : undefined;
        await mandar(canal, m.de, [saludo, 'Sigamos donde nos quedamos 👇', ...ultimas.slice(-3)], botones);
        return;
      }
    }

    // Sticker, imagen, etc.: no es una respuesta al reto, no se evalúa ni cambia nada.
    if (m.tipo === 'otro' && !saludo) {
      await mandar(canal, m.de, MENSAJES_VINCULACION.noSoportado);
      return;
    }

    let entrada: EntradaAlumno;
    if (saludo) {
      // El mensaje con el código no es una respuesta al reto: arranca la conversación.
      entrada = { tipo: 'texto', texto: 'hola' };
    } else if (m.tipo === 'audio') {
      if (!canal.descargarAudio) throw new Error(`El canal ${canal.nombre} no descarga audio`);
      const { audio, mime } = await canal.descargarAudio(m.media_id);
      entrada = { tipo: 'audio', audio, mime: m.mime ?? mime };
    } else if (m.tipo === 'otro') {
      return; // inalcanzable: se atiende arriba
    } else {
      entrada = { tipo: m.tipo, texto: m.texto };
    }

    const r = await procesar(deps.motor, {
      alumno_id: alumno.id,
      canal: 'whatsapp',
      entrada,
      mensaje_externo_id: m.id_externo,
    });
    if (r.duplicado) return;
    await mandar(canal, m.de, saludo ? [saludo, ...r.mensajes] : r.mensajes, r.botones);
  } catch (err) {
    console.error('[whatsapp] error atendiendo mensaje:', enmascarar(err));
    await mandar(canal, m.de, MENSAJES_VINCULACION.error).catch(() => undefined);
  }
}
