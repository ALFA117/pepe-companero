/**
 * LLM de mentira para los tests: cada rol (pepe/juez) responde con una
 * función programable y se guardan todas las peticiones para revisarlas.
 */
import type { GenerarJSON, PeticionJSON, RolModelo } from '@/ia/llm';

type Manejador = (p: PeticionJSON<unknown>, n: number) => unknown | Promise<unknown>;

export interface LLMFalso {
  generar: GenerarJSON;
  peticiones: PeticionJSON<unknown>[];
  de(rol: RolModelo): PeticionJSON<unknown>[];
}

export function llmFalso(manejadores: Partial<Record<RolModelo, Manejador>>): LLMFalso {
  const peticiones: PeticionJSON<unknown>[] = [];
  const cuenta: Record<RolModelo, number> = { pepe: 0, juez: 0 };
  const generar = (async (p: PeticionJSON<unknown>) => {
    peticiones.push(p);
    const m = manejadores[p.modelo];
    if (!m) throw new Error(`LLM falso sin manejador para ${p.modelo}`);
    const crudo = await m(p, cuenta[p.modelo]++);
    // Igual que el AI SDK: la salida se valida con el esquema.
    return p.esquema.parse(crudo);
  }) as GenerarJSON;
  return { generar, peticiones, de: (rol) => peticiones.filter((p) => p.modelo === rol) };
}

/** Espera `ms` o hasta que se cancele la señal. */
export function esperar(ms: number, senal?: AbortSignal): Promise<void> {
  return new Promise((resolver, rechazar) => {
    const t = setTimeout(resolver, ms);
    senal?.addEventListener('abort', () => {
      clearTimeout(t);
      rechazar(new Error('cancelado'));
    });
  });
}

/** Evaluación "cruda" del Juez (lo que devolvería el LLM). */
export function juezCrudo(clasificacion: string, extra: Record<string, unknown> = {}) {
  return {
    clasificacion,
    detecto_error: clasificacion === 'correcta' ? true : null,
    explica_por_que: clasificacion === 'correcta' ? 'si' : null,
    usa_evidencia_textual: null,
    conceptos_demostrados: [],
    brecha_probable: null,
    comentario_docente: 'comentario',
    confianza: 0.9,
    ...extra,
  };
}

export function finalCrudo(extra: Record<string, unknown> = {}) {
  return {
    resuelto: true,
    explicacion_final: {
      identifica_error: true,
      explica_por_que: true,
      usa_evidencia_textual: null,
      vocabulario: 'informal',
    },
    brechas_detectadas: ['fracciones_equivalentes'],
    estrategia_aprendida: 'comparar con media pizza',
    comentario_docente: 'Explica bien con sus palabras.',
    ...extra,
  };
}
