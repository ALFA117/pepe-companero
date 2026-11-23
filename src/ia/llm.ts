/**
 * Puerto hacia el LLM. El motor solo conoce esta interfaz; la implementación
 * real (Anthropic con el AI SDK) está en `anthropic.ts` y en los tests se usa
 * un doble. Así el Juez y Pepe se prueban sin red.
 */
import type { z } from 'zod';

export type RolModelo = 'pepe' | 'juez';

export interface PeticionJSON<T> {
  modelo: RolModelo;
  /** Prompt de sistema. */
  instrucciones: string;
  /** Mensaje con el contexto del turno. */
  prompt: string;
  /** Esquema "relajado" (sin min/max), que el proveedor sí puede forzar. */
  esquema: z.ZodType<T>;
  /** Se cancela la llamada si se pasa de esta señal. */
  senal?: AbortSignal;
}

export type GenerarJSON = <T>(p: PeticionJSON<T>) => Promise<T>;

/** El LLM tardó más de lo permitido. */
export class TiempoAgotadoError extends Error {
  constructor() {
    super('El LLM tardó demasiado');
    this.name = 'TiempoAgotadoError';
  }
}

/** Corre `fn` con un límite de tiempo y le pasa la señal para que cancele. */
export async function conLimite<T>(
  ms: number,
  fn: (senal: AbortSignal) => Promise<T>,
  senalExterna?: AbortSignal,
): Promise<T> {
  const control = new AbortController();
  const cancelarExterna = () => control.abort();
  senalExterna?.addEventListener('abort', cancelarExterna, { once: true });
  let reloj: ReturnType<typeof setTimeout> | undefined;
  const limite = new Promise<never>((_, rechazar) => {
    reloj = setTimeout(() => {
      control.abort();
      rechazar(new TiempoAgotadoError());
    }, ms);
  });
  try {
    if (senalExterna?.aborted) throw new TiempoAgotadoError();
    return await Promise.race([fn(control.signal), limite]);
  } finally {
    clearTimeout(reloj);
    senalExterna?.removeEventListener('abort', cancelarExterna);
  }
}
