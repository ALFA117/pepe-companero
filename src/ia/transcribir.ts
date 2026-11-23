/**
 * Voz a texto con Groq (whisper-large-v3-turbo), con marcas de tiempo por palabra.
 *
 * - Se llama directo a la API REST para controlar el formato de respuesta.
 * - El audio solo vive en memoria; nunca se escribe a disco ni a Storage.
 * - NO se manda el texto original como `prompt`: eso escondería los errores
 *   de lectura del alumno.
 */
import { z } from 'zod';
import { env, exigir } from '@/lib/env';
import type { PalabraTranscrita } from '@/motor/fluidez';
import { conLimite } from './llm';

export interface Transcripcion {
  texto: string;
  palabras: PalabraTranscrita[];
}

export type Transcriptor = (audio: ArrayBuffer, mime: string) => Promise<Transcripcion>;

const URL_GROQ = 'https://api.groq.com/openai/v1/audio/transcriptions';
export const LIMITE_TRANSCRIPCION_MS = 30_000;

const RespuestaGroq = z.object({
  text: z.string(),
  words: z
    .array(z.object({ word: z.string(), start: z.number(), end: z.number() }))
    .optional()
    .default([]),
});

/** Extensión que entiende la API según el tipo MIME (WhatsApp: ogg; navegador: webm o mp4). */
export function extensionPara(mime: string): string {
  const m = mime.toLowerCase();
  if (m.includes('ogg') || m.includes('opus')) return 'ogg';
  if (m.includes('webm')) return 'webm';
  if (m.includes('mp4') || m.includes('m4a') || m.includes('aac')) return 'm4a';
  if (m.includes('mpeg') || m.includes('mp3')) return 'mp3';
  if (m.includes('wav')) return 'wav';
  if (m.includes('flac')) return 'flac';
  return 'ogg';
}

export const transcribirConGroq: Transcriptor = async (audio, mime) => {
  const form = new FormData();
  const tipo = mime.split(';')[0] || 'audio/ogg';
  form.append('file', new Blob([audio], { type: tipo }), `nota.${extensionPara(mime)}`);
  form.append('model', env().MODEL_STT);
  form.append('language', 'es');
  form.append('response_format', 'verbose_json');
  form.append('timestamp_granularities[]', 'word');
  form.append('temperature', '0');

  const res = await conLimite(LIMITE_TRANSCRIPCION_MS, (senal) =>
    fetch(URL_GROQ, {
      method: 'POST',
      headers: { Authorization: `Bearer ${exigir('GROQ_API_KEY')}` },
      body: form,
      signal: senal,
    }),
  );
  if (!res.ok) {
    throw new Error(`Groq transcripción ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const datos = RespuestaGroq.parse(await res.json());
  return {
    texto: datos.text.trim(),
    palabras: datos.words.map((w) => ({ palabra: w.word.trim(), inicio: w.start, fin: w.end })),
  };
};
