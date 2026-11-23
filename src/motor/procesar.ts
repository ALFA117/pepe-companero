/**
 * Orquestador del motor (sección 4 del brief). Lo usan la web y WhatsApp.
 *
 *   entrada → (transcribir si es audio) → Juez → máquina → Pepe (+ filtro) → guardar
 *
 * Todas las dependencias se inyectan (repositorio, LLM, transcriptor, banco),
 * así que se prueba de punta a punta sin red.
 *
 * Garantías:
 *   - Idempotencia: un `mensaje_externo_id` repetido no se procesa dos veces.
 *   - Bloqueo optimista: si dos mensajes llegan al mismo tiempo, el segundo se
 *     vuelve a evaluar sobre la sesión ya actualizada.
 *   - El audio solo vive en memoria durante la transcripción.
 */
import type { GenerarJSON } from '@/ia/llm';
import type { Transcripcion, Transcriptor } from '@/ia/transcribir';
import {
  SesionActivaDuplicadaError,
  type MetricasFluidez,
  type Repositorio,
  type SesionGuardada,
  type TipoTurno,
} from '@/db/repositorio';
import { calcularFluidez } from './fluidez';
import { evaluarCierre, evaluarTurno, TURNOS_DE_CONTEXTO, type OrigenEvaluacion } from './juez';
import { crearSesion, transicion } from './maquina';
import { redactar, type OrigenSalida } from './pepe';
import type {
  AccionPepe,
  Clasificacion,
  EntradaAlumno,
  EvaluacionTurno,
  EventoMotor,
  NombreCanal,
  Reto,
  SalidaPepe,
  Sesion,
  Turno,
} from './tipos';

export interface DependenciasMotor {
  repo: Repositorio;
  generar: GenerarJSON;
  /** Sin transcriptor, los audios se contestan pidiendo texto. */
  transcribir?: Transcriptor;
  banco: readonly Reto[];
  /** Genera ids de sesión (inyectable para tests). */
  nuevoId?: () => string;
}

export interface EntradaProcesar {
  alumno_id: string;
  canal: NombreCanal;
  entrada: EntradaAlumno;
  /** ID del mensaje en el proveedor (WhatsApp) o del cliente (web). */
  mensaje_externo_id?: string;
}

export interface RespuestaMotor {
  duplicado: boolean;
  mensajes: string[];
  botones?: string[];
  sesion: SesionGuardada | null;
  /** Para depurar y para el simulador. */
  detalle?: {
    accion: AccionPepe['tipo'];
    origen_pepe: OrigenSalida;
    clasificacion?: string;
    origen_juez?: OrigenEvaluacion;
    transcripcion?: string;
  };
}

const MAX_INTENTOS = 3;
const RE_NO_PUEDE_GRABAR =
  /no (puedo|tengo|me deja|sirve|funciona|se puede)|sin (micro|audio)|no hay (micro|audio)|no se puede grabar/i;

const NO_ESCUCHE: SalidaPepe = {
  mensajes: ['Uy, no alcancé a escuchar tu audio 😅 ¿Lo intentas otra vez o me lo escribes?'],
};
const SIN_RETOS: SalidaPepe = {
  mensajes: ['¡Ya me ayudaste con todas mis tareas! 🙌 Pronto te traigo más.'],
};

// ─────────────────────────────────────────────────────────────
// Elección del reto cuando el alumno no tiene sesión activa
// ─────────────────────────────────────────────────────────────

/** El primer reto de todo alumno: el de la demo (sección 8 del brief). */
export const RETO_INICIAL = 'mate-suma-fracciones-01';

export function elegirRetoInicial(
  banco: readonly Reto[],
  ultima: Sesion | null,
  hechos: readonly string[],
): Reto | null {
  if (ultima?.siguiente_reto_id) {
    const sig = banco.find((r) => r.id === ultima.siguiente_reto_id);
    if (sig) return sig;
  }
  const inicial = banco.find((r) => r.id === RETO_INICIAL);
  if (inicial && !hechos.includes(inicial.id)) return inicial;
  const ordenados = [...banco].sort(
    (a, b) =>
      a.dificultad - b.dificultad ||
      // Matemáticas primero: es el reto más corto para la primera vez.
      (a.materia === b.materia ? 0 : a.materia === 'matematicas' ? -1 : 1) ||
      a.id.localeCompare(b.id),
  );
  return ordenados.find((r) => !hechos.includes(r.id)) ?? ordenados[0] ?? null;
}

// ─────────────────────────────────────────────────────────────
// Procesar
// ─────────────────────────────────────────────────────────────

export async function procesar(deps: DependenciasMotor, p: EntradaProcesar): Promise<RespuestaMotor> {
  const { repo } = deps;
  const nuevoId = deps.nuevoId ?? (() => crypto.randomUUID());

  if (p.mensaje_externo_id && (await repo.existeMensajeExterno(p.mensaje_externo_id))) {
    return { duplicado: true, mensajes: [], sesion: null };
  }

  // 1. Convertir la entrada a texto (el audio se transcribe y se descarta).
  let transcripcion: Transcripcion | null = null;
  let texto: string;
  const tipoTurno: TipoTurno = p.entrada.tipo;
  if (p.entrada.tipo === 'audio') {
    try {
      if (!deps.transcribir) throw new Error('Sin transcriptor configurado');
      transcripcion = await deps.transcribir(p.entrada.audio, p.entrada.mime);
    } catch (err) {
      console.warn('[procesar] no se pudo transcribir:', err instanceof Error ? err.message : err);
    }
    texto = transcripcion?.texto || '[nota de voz sin transcribir]';
  } else {
    texto = p.entrada.texto.trim();
  }

  // 2. Sesión activa (o una nueva).
  let sesion = await repo.sesionActiva(p.alumno_id);

  if (!sesion) {
    const [ultima, hechos] = await Promise.all([repo.ultimaSesion(p.alumno_id), repo.retosHechos(p.alumno_id)]);
    const reto = elegirRetoInicial(deps.banco, ultima, hechos);
    if (!reto) return { duplicado: false, ...SIN_RETOS, sesion: null };
    const inicio = crearSesion({ id: nuevoId(), alumno_id: p.alumno_id, reto, canal: p.canal });
    try {
      sesion = await repo.insertarSesion(inicio.sesion);
    } catch (err) {
      // Otro mensaje del mismo alumno creó la sesión al mismo tiempo: se usa esa.
      if (!(err instanceof SesionActivaDuplicadaError)) throw err;
      sesion = await repo.sesionActiva(p.alumno_id);
      if (!sesion) throw err;
    }
    if (sesion.id === inicio.sesion.id) {
      const turno = await registrarAlumno(repo, sesion.id, tipoTurno, texto, p.mensaje_externo_id);
      if (!turno) return { duplicado: true, mensajes: [], sesion };
      return responder(deps, { reto, sesion, accion: inicio.accion, ultimoMensaje: texto });
    }
  }

  const reto = retoDe(deps.banco, sesion.reto_id);
  const turnoAlumno = await registrarAlumno(repo, sesion.id, tipoTurno, texto, p.mensaje_externo_id);
  if (!turnoAlumno) return { duplicado: true, mensajes: [], sesion };

  if (sesion.fase === 'pendiente') {
    const r = transicion(sesion, { tipo: 'iniciar' }, { reto, banco: deps.banco });
    const guardada = (await repo.actualizarSesion(sesion, r.sesion)) ?? sesion;
    return responder(deps, { reto, sesion: guardada, accion: r.accion, ultimoMensaje: texto });
  }

  // Audio que no se pudo transcribir: no cambia nada, se pide de nuevo.
  if (p.entrada.tipo === 'audio' && !transcripcion?.texto) {
    await guardarPepe(repo, sesion.id, NO_ESCUCHE);
    return { duplicado: false, mensajes: NO_ESCUCHE.mensajes, sesion };
  }

  // 3. Evaluar y transicionar, con reintento si otro mensaje ganó la carrera.
  const yaHechos = await repo.retosHechos(p.alumno_id);
  for (let intento = 0; intento < MAX_INTENTOS; intento++) {
    const historialCompleto = await repo.ultimosTurnos(sesion.id, TURNOS_DE_CONTEXTO + 4);
    const previos = historialSin(historialCompleto, turnoAlumno);

    const { evento, origenJuez, clasificacionJuez, evaluacion, fluidez } = await construirEvento(deps, {
      reto,
      sesion,
      texto,
      transcripcion,
      esAudio: p.entrada.tipo === 'audio',
      previos,
    });

    const r = transicion(sesion, evento, { reto, banco: deps.banco, ya_hechos: yaHechos });
    const guardada = await repo.actualizarSesion(sesion, r.sesion);
    if (!guardada) {
      // Otro mensaje actualizó la sesión primero: recargar y volver a evaluar.
      const recargada = await repo.sesionPorId(sesion.id);
      if (!recargada || recargada.fase === 'terminado') break;
      sesion = recargada;
      continue;
    }

    // Guardar lo que dijo el Juez y las métricas.
    if (evaluacion && r.clasificacion_efectiva) {
      await repo.guardarEvaluacion({
        turno_id: turnoAlumno,
        sesion_id: sesion.id,
        clasificacion: r.clasificacion_efectiva,
        nivel: sesion.nivel,
        paso: sesion.paso,
        juez: { ...evaluacion, clasificacion_juez: clasificacionJuez ?? evaluacion.clasificacion },
      });
    }
    if (r.evaluacion_final) await repo.guardarEvaluacionFinal(sesion.id, r.evaluacion_final);
    if (fluidez && evento.tipo === 'lectura_audio') await repo.guardarFluidez(sesion.id, fluidez);

    // Al terminar, el siguiente reto queda listo (pendiente) para cuando vuelva a escribir.
    const accion = r.accion;
    if (accion.tipo === 'despedir' && accion.siguiente_reto_id) {
      const sig = deps.banco.find((x) => x.id === accion.siguiente_reto_id);
      if (sig) {
        const pendiente = crearSesion({ id: nuevoId(), alumno_id: p.alumno_id, reto: sig, canal: p.canal, pendiente: true });
        await repo.insertarSesion(pendiente.sesion);
      }
    }

    const respuesta = await responder(deps, {
      reto,
      sesion: guardada,
      accion: r.accion,
      ultimoMensaje: texto,
    });
    return {
      ...respuesta,
      detalle: {
        ...respuesta.detalle!,
        clasificacion: r.clasificacion_efectiva,
        origen_juez: origenJuez,
        transcripcion: transcripcion?.texto,
      },
    };
  }

  const ocupado: SalidaPepe = { mensajes: ['Dame un segundito, se me cruzaron los cables 😅 ¿Me lo repites?'] };
  await guardarPepe(repo, sesion.id, ocupado);
  return { duplicado: false, mensajes: ocupado.mensajes, sesion };
}

// ─────────────────────────────────────────────────────────────
// Piezas
// ─────────────────────────────────────────────────────────────

function retoDe(banco: readonly Reto[], id: string): Reto {
  const reto = banco.find((r) => r.id === id);
  if (!reto) throw new Error(`La sesión apunta a un reto que no existe: ${id}`);
  return reto;
}

async function registrarAlumno(
  repo: Repositorio,
  sesionId: string,
  tipo: TipoTurno,
  texto: string,
  mensajeExternoId?: string,
): Promise<string | null> {
  return repo.agregarTurno({
    sesion_id: sesionId,
    rol: 'alumno',
    tipo,
    texto,
    mensaje_externo_id: mensajeExternoId ?? null,
  });
}

/** Historial anterior al turno actual del alumno. */
function historialSin(turnos: (Turno & { id: string })[], turnoActual: string): Turno[] {
  const i = turnos.findIndex((t) => t.id === turnoActual);
  const previos = i >= 0 ? turnos.slice(0, i) : turnos;
  return previos.map(({ rol, texto }) => ({ rol, texto }));
}

/** Los mensajes seguidos de Pepe justo antes del turno del alumno. */
function ultimaPreguntaDePepe(previos: readonly Turno[], reto: Reto): string {
  const pepe: string[] = [];
  for (let i = previos.length - 1; i >= 0 && previos[i]!.rol === 'pepe'; i--) pepe.unshift(previos[i]!.texto);
  return pepe.length > 0 ? pepe.join('\n') : reto.planteamiento_pepe.join('\n');
}

interface EventoConstruido {
  evento: EventoMotor;
  evaluacion?: EvaluacionTurno;
  clasificacionJuez?: Clasificacion;
  origenJuez?: OrigenEvaluacion;
  fluidez?: MetricasFluidez;
}

async function construirEvento(
  deps: DependenciasMotor,
  c: {
    reto: Reto;
    sesion: Sesion;
    texto: string;
    transcripcion: Transcripcion | null;
    esAudio: boolean;
    previos: Turno[];
  },
): Promise<EventoConstruido> {
  const { reto, sesion } = c;
  switch (sesion.fase) {
    case 'leyendo_texto': {
      if (c.esAudio && c.transcripcion) {
        const textoOriginal = reto.texto?.parrafos.join(' ') ?? '';
        const fluidez = calcularFluidez(textoOriginal, c.transcripcion.palabras);
        return { evento: { tipo: 'lectura_audio' }, fluidez: fluidez ?? undefined };
      }
      return {
        evento: { tipo: 'lectura_texto', no_puede_grabar: RE_NO_PUEDE_GRABAR.test(c.texto) },
      };
    }
    case 'nivel': {
      const { evaluacion, origen } = await evaluarTurno(deps.generar, {
        reto,
        sesion,
        pregunta_pepe: ultimaPreguntaDePepe(c.previos, reto),
        respuesta_alumno: c.texto,
        historial: c.previos,
      });
      return {
        evento: { tipo: 'evaluacion', evaluacion },
        evaluacion,
        clasificacionJuez: evaluacion.clasificacion,
        origenJuez: origen,
      };
    }
    case 'cierre': {
      const { evaluacion, origen } = await evaluarCierre(deps.generar, {
        reto,
        explicacion_alumno: c.texto,
        historial: c.previos,
      });
      return { evento: { tipo: 'evaluacion_final', evaluacion }, origenJuez: origen };
    }
    default:
      throw new Error(`Fase sin evento de alumno: ${sesion.fase}`);
  }
}

async function guardarPepe(repo: Repositorio, sesionId: string, salida: SalidaPepe): Promise<void> {
  for (const m of salida.mensajes) {
    await repo.agregarTurno({ sesion_id: sesionId, rol: 'pepe', tipo: 'texto', texto: m });
  }
}

async function responder(
  deps: DependenciasMotor,
  c: { reto: Reto; sesion: SesionGuardada; accion: AccionPepe; ultimoMensaje?: string },
): Promise<RespuestaMotor> {
  const historial = (await deps.repo.ultimosTurnos(c.sesion.id, TURNOS_DE_CONTEXTO)).map(({ rol, texto }) => ({
    rol,
    texto,
  }));
  const { salida, origen } = await redactar(deps.generar, {
    reto: c.reto,
    sesion: c.sesion,
    accion: c.accion,
    historial,
    ultimo_mensaje_alumno: c.ultimoMensaje,
  });
  await guardarPepe(deps.repo, c.sesion.id, salida);
  return {
    duplicado: false,
    mensajes: salida.mensajes,
    ...(salida.botones?.length ? { botones: salida.botones } : {}),
    sesion: c.sesion,
    detalle: { accion: c.accion.tipo, origen_pepe: origen },
  };
}
