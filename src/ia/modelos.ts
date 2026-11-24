/**
 * Implementación real del puerto `GenerarJSON` con el AI SDK 7.
 *
 * Los modelos se configuran como "proveedor:modelo" (MODEL_PEPE, MODEL_JUEZ,
 * MODEL_RESPALDO; este último acepta varios separados por coma).
 *
 * El plan gratis de Groq da 8K tokens por minuto POR MODELO, así que la
 * cadena de respaldo usa primero los otros modelos de Groq (cada uno con su
 * propio límite) y al final MODEL_RESPALDO. Si Groq dice "intenta en 1.2 s",
 * se espera y se reintenta el mismo modelo una vez, si el tiempo alcanza.
 * El límite de tiempo total lo pone quien llama, con la señal.
 */
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createGroq } from '@ai-sdk/groq';
import { generateText, Output, type LanguageModel } from 'ai';
import { env, exigir, hayLlavePara } from '@/lib/env';
import type { GenerarJSON, PeticionJSON, RolModelo } from './llm';

type Proveedor = 'groq' | 'google' | 'anthropic';

/** Modelos de Groq con salida estructurada estricta, para la cadena de respaldo. */
const RESPALDOS_GROQ = ['groq:openai/gpt-oss-20b', 'groq:openai/gpt-oss-120b'];
/** Esperar a que se libere el límite solo si es poco tiempo. */
const ESPERA_MAXIMA_MS = 3_000;

export function separarIdModelo(id: string): { proveedor: Proveedor; modelo: string } {
  const i = id.indexOf(':');
  const proveedor = id.slice(0, i) as Proveedor;
  const modelo = id.slice(i + 1);
  if (i < 1 || !modelo || !['groq', 'google', 'anthropic'].includes(proveedor)) {
    throw new Error(`Modelo inválido "${id}": usa proveedor:modelo (groq, google o anthropic)`);
  }
  return { proveedor, modelo };
}

const fabricas: Partial<Record<Proveedor, (modelo: string) => LanguageModel>> = {};

function modeloDe(id: string): LanguageModel {
  const { proveedor, modelo } = separarIdModelo(id);
  if (!fabricas[proveedor]) {
    switch (proveedor) {
      case 'groq': {
        const p = createGroq({ apiKey: exigir('GROQ_API_KEY') });
        fabricas.groq = (m) => p(m);
        break;
      }
      case 'google': {
        const p = createGoogleGenerativeAI({ apiKey: exigir('GOOGLE_GENERATIVE_AI_API_KEY') });
        fabricas.google = (m) => p(m);
        break;
      }
      case 'anthropic': {
        const p = createAnthropic({ apiKey: exigir('ANTHROPIC_API_KEY') });
        fabricas.anthropic = (m) => p(m);
        break;
      }
    }
  }
  return fabricas[proveedor]!(modelo);
}

/** Modelos a intentar para un rol, en orden y sin repetir. */
export function cadenaDeModelos(rol: RolModelo): string[] {
  const e = env();
  const respaldos = (e.MODEL_RESPALDO ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  // Prioridad cuando se acaba el límite por minuto: el Juez decide el nivel y
  // no tiene un buen respaldo, así que puede usar todos los modelos. Pepe sí
  // tiene respaldo (el `ejemplo` del paso), así que nunca le gasta el cupo al
  // modelo del Juez: solo usa el suyo y los de MODEL_RESPALDO de otros proveedores.
  const candidatos =
    rol === 'pepe'
      ? [e.MODEL_PEPE, ...respaldos.filter((id) => id !== e.MODEL_JUEZ && !RESPALDOS_GROQ.includes(id))]
      : [e.MODEL_JUEZ, e.MODEL_PEPE, ...RESPALDOS_GROQ, ...respaldos];
  return [...new Set(candidatos)].filter((id) => {
    try {
      separarIdModelo(id);
      return hayLlavePara(id);
    } catch {
      return false;
    }
  });
}

/** Si el error es de límite de uso con espera corta, devuelve cuántos ms esperar. */
export function esperaPorLimite(err: unknown): number | null {
  const texto = err instanceof Error ? err.message : String(err);
  if (!/rate limit/i.test(texto)) return null;
  const m = texto.match(/try again in ([\d.]+)\s*(ms|s)/i);
  if (!m) return null;
  const ms = Number(m[1]) * (m[2]!.toLowerCase() === 's' ? 1000 : 1);
  return Number.isFinite(ms) && ms <= ESPERA_MAXIMA_MS ? Math.ceil(ms) + 100 : null;
}

function dormir(ms: number, senal?: AbortSignal): Promise<void> {
  return new Promise((resolver, rechazar) => {
    const t = setTimeout(resolver, ms);
    senal?.addEventListener('abort', () => {
      clearTimeout(t);
      rechazar(new Error('cancelado'));
    }, { once: true });
  });
}

async function generarCon<T>(idModelo: string, p: PeticionJSON<T>): Promise<T> {
  const { proveedor } = separarIdModelo(idModelo);
  const { output } = await generateText({
    model: modeloDe(idModelo),
    instructions: p.instrucciones,
    prompt: p.prompt,
    output: Output.object({ schema: p.esquema }),
    abortSignal: p.senal,
    // Sin reintentos automáticos: el motor tiene su propio respaldo y límite de tiempo.
    maxRetries: 0,
    temperature: p.modelo === 'juez' ? 0 : 0.7,
    providerOptions:
      proveedor === 'groq'
        ? // Los modelos razonan antes de contestar; "low" ahorra tokens del límite por minuto.
          { groq: { reasoningEffort: 'low' } }
        : undefined,
  });
  return output;
}

export const generarJSON: GenerarJSON = async (p) => {
  let ultimoError: unknown;
  for (const id of cadenaDeModelos(p.modelo)) {
    for (let intento = 0; intento < 2; intento++) {
      if (p.senal?.aborted) throw ultimoError ?? new Error('cancelado');
      try {
        return await generarCon(id, p);
      } catch (err) {
        ultimoError = err;
        const espera = intento === 0 ? esperaPorLimite(err) : null;
        console.warn(`[ia] falló ${id} (${p.modelo})${espera ? `, reintento en ${espera} ms` : ''}:`, err instanceof Error ? err.message.slice(0, 160) : err);
        if (espera === null) break;
        await dormir(espera, p.senal);
      }
    }
  }
  throw ultimoError ?? new Error('No hay modelos configurados');
};
