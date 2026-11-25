/**
 * Chat web del alumno: mismo motor que WhatsApp.
 *
 *   POST application/json      { codigo, tipo: "texto" | "boton", texto, id }
 *   POST multipart/form-data   codigo, id, audio (archivo)
 *
 * `id` lo genera el navegador por mensaje: si la petición se repite (doble
 * clic, reintento de red), el motor no la procesa dos veces.
 */
import { z } from 'zod';
import { dependenciasMotor } from '@/motor/servidor';
import { procesar } from '@/motor/procesar';
import type { EntradaAlumno } from '@/motor/tipos';
import { infoDeRetos } from '@/panel/calcular';
import { listarRetos } from '@/retos/cargar';

export const maxDuration = 60;

const MAX_AUDIO_BYTES = 10 * 1024 * 1024;

const CuerpoTexto = z.object({
  codigo: z.string().min(1).max(40),
  tipo: z.enum(['texto', 'boton']),
  texto: z.string().trim().min(1).max(1000),
  id: z.string().min(8).max(80),
});

export interface RespuestaChat {
  duplicado: boolean;
  mensajes: string[];
  botones?: string[];
  fase: string | null;
  /** Pistas usadas en el reto (0 a 4). */
  nivel: number | null;
  /** El reto en curso, para el encabezado del chat. */
  reto: { titulo: string; materia: 'matematicas' | 'lectura' } | null;
}

function retoDe(id: string | undefined, fase: string | undefined): RespuestaChat['reto'] {
  if (!id || fase === 'pendiente') return null;
  const info = infoDeRetos(listarRetos()).get(id);
  return info ? { titulo: info.titulo, materia: info.materia } : null;
}

function error(estado: number, mensaje: string) {
  return Response.json({ error: mensaje }, { status: estado });
}

export async function POST(req: Request) {
  let codigo: string;
  let id: string;
  let entrada: EntradaAlumno;

  const tipo = req.headers.get('content-type') ?? '';
  try {
    if (tipo.includes('multipart/form-data')) {
      const form = await req.formData();
      const audio = form.get('audio');
      codigo = String(form.get('codigo') ?? '');
      id = String(form.get('id') ?? '');
      if (!codigo || id.length < 8) return error(400, 'Faltan el código o el id');
      if (!(audio instanceof Blob) || audio.size === 0) return error(400, 'Falta el audio');
      if (audio.size > MAX_AUDIO_BYTES) return error(413, 'La nota de voz es muy larga');
      // El audio solo vive en memoria: se transcribe y se descarta.
      entrada = { tipo: 'audio', audio: await audio.arrayBuffer(), mime: audio.type || 'audio/webm' };
    } else {
      const cuerpo = CuerpoTexto.safeParse(await req.json().catch(() => null));
      if (!cuerpo.success) return error(400, 'Mensaje inválido');
      ({ codigo, id } = cuerpo.data);
      entrada = { tipo: cuerpo.data.tipo, texto: cuerpo.data.texto };
    }
  } catch {
    return error(400, 'No pude leer el mensaje');
  }

  try {
    const deps = dependenciasMotor();
    const alumno = await deps.repo.alumnoPorCodigo(codigo);
    if (!alumno) return error(404, 'Ese código no existe');

    const r = await procesar(deps, {
      alumno_id: alumno.id,
      canal: 'web',
      entrada,
      mensaje_externo_id: `web:${id}`,
    });
    const respuesta: RespuestaChat = {
      duplicado: r.duplicado,
      mensajes: r.mensajes,
      ...(r.botones ? { botones: r.botones } : {}),
      fase: r.sesion?.fase ?? null,
      nivel: r.sesion?.nivel ?? null,
      reto: retoDe(r.sesion?.reto_id, r.sesion?.fase),
    };
    return Response.json(respuesta);
  } catch (err) {
    console.error('[api/chat]', err);
    return error(500, 'Pepe se trabó. Intenta otra vez.');
  }
}
