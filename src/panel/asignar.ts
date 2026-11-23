/**
 * "Asignar reto" desde el panel: crea una sesión nueva y, si se puede, le
 * manda el primer mensaje por WhatsApp.
 *
 * WhatsApp solo permite mensajes libres dentro de las 24 h desde el último
 * mensaje del alumno (fuera de eso hacen falta plantillas aprobadas). Fuera
 * de la ventana, la sesión queda `pendiente` y arranca cuando el alumno
 * escriba, por WhatsApp o en la web.
 */
import type { Canal } from '@/canales/tipos';
import { crearSesion, transicion } from '@/motor/maquina';
import { redactar } from '@/motor/pepe';
import type { DependenciasMotor } from '@/motor/procesar';

export const VENTANA_WHATSAPP_MS = 24 * 3600 * 1000;
export const AVISO_RETO_NUEVO = '¡Tu profe nos dejó un reto nuevo! 🙌';

export type ResultadoAsignar =
  | { estado: 'enviado'; sesion_id: string }
  | { estado: 'pendiente'; sesion_id: string; motivo: 'sin_whatsapp' | 'ventana_cerrada' | 'error_envio' };

export interface DependenciasAsignar {
  motor: DependenciasMotor;
  canal?: Canal;
  descifrarTelefono: (valor: string) => string;
  ahora?: () => Date;
  nuevoId?: () => string;
}

export function ventanaAbierta(ultimoMensaje: string | null, ahora: Date): boolean {
  if (!ultimoMensaje) return false;
  return ahora.getTime() - new Date(ultimoMensaje).getTime() < VENTANA_WHATSAPP_MS;
}

export async function asignarReto(deps: DependenciasAsignar, alumnoId: string, retoId: string): Promise<ResultadoAsignar> {
  const { repo, banco } = deps.motor;
  const reto = banco.find((r) => r.id === retoId);
  if (!reto) throw new Error(`No existe el reto ${retoId}`);
  const alumno = await repo.alumnoPorId(alumnoId);
  if (!alumno) throw new Error('No existe el alumno');

  const ahora = deps.ahora?.() ?? new Date();
  const nueva = crearSesion({
    id: deps.nuevoId?.() ?? crypto.randomUUID(),
    alumno_id: alumno.id,
    reto,
    canal: 'whatsapp',
    pendiente: true,
  });
  const pendiente = await repo.insertarSesion(nueva.sesion);

  if (!alumno.tel_cifrado || !deps.canal) return { estado: 'pendiente', sesion_id: pendiente.id, motivo: 'sin_whatsapp' };
  if (!ventanaAbierta(alumno.ultimo_mensaje_wa_en, ahora)) {
    return { estado: 'pendiente', sesion_id: pendiente.id, motivo: 'ventana_cerrada' };
  }

  try {
    const r = transicion(pendiente, { tipo: 'iniciar' }, { reto, banco });
    const iniciada = (await repo.actualizarSesion(pendiente, r.sesion)) ?? pendiente;
    const { salida } = await redactar(deps.motor.generar, { reto, sesion: iniciada, accion: r.accion, historial: [] });
    const mensajes = [AVISO_RETO_NUEVO, ...salida.mensajes];
    const tel = deps.descifrarTelefono(alumno.tel_cifrado);
    for (const m of mensajes) {
      await deps.canal.enviarTexto(tel, m);
      await repo.agregarTurno({ sesion_id: iniciada.id, rol: 'pepe', tipo: 'texto', texto: m });
    }
    return { estado: 'enviado', sesion_id: iniciada.id };
  } catch (err) {
    console.error('[asignar] no se pudo enviar por WhatsApp:', err);
    return { estado: 'pendiente', sesion_id: pendiente.id, motivo: 'error_envio' };
  }
}
