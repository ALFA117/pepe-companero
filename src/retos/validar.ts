/**
 * Validación de retos: el esquema zod más las reglas de contenido que zod
 * no puede expresar. Es código puro para poder probarlo con retos sintéticos.
 */
import { contarPalabras, frasesProhibidasEn } from '@/lib/texto';
import {
  NIVELES_AYUDA,
  RetoSchema,
  SalidaPepeSchema,
  type Reto,
} from '@/motor/tipos';

/** Rango de palabras de los textos de lectura. */
export const PALABRAS_TEXTO_MIN = 70;
export const PALABRAS_TEXTO_MAX = 110;

export class RetoInvalidoError extends Error {
  constructor(
    readonly origen: string,
    readonly problemas: string[],
  ) {
    super(`Reto inválido (${origen}):\n${problemas.map((p) => `  - ${p}`).join('\n')}`);
    this.name = 'RetoInvalidoError';
  }
}

/** Valida un reto. Devuelve el reto tipado o lanza `RetoInvalidoError` con TODOS los problemas. */
export function validarReto(datos: unknown, origen = 'reto'): Reto {
  const r = RetoSchema.safeParse(datos);
  if (!r.success) {
    throw new RetoInvalidoError(
      origen,
      r.error.issues.map((i) => `${i.path.join('.') || '(raíz)'}: ${i.message}`),
    );
  }
  const reto = r.data;
  const problemas = problemasDeContenido(reto);
  if (problemas.length > 0) throw new RetoInvalidoError(origen, problemas);
  return reto;
}

function problemasDeContenido(reto: Reto): string[] {
  const problemas: string[] = [];

  // 1. Lo que Pepe puede decir tal cual (planteamiento y ejemplos de respaldo)
  //    tiene que caber en una SalidaPepe y no puede contener nada prohibido.
  const bloques: { donde: string; mensajes: string[]; botones?: string[] }[] = [
    { donde: 'planteamiento_pepe', mensajes: reto.planteamiento_pepe },
  ];
  for (const n of NIVELES_AYUDA) {
    reto.niveles[n].pasos.forEach((p, i) => {
      bloques.push({
        donde: `niveles.${n}.pasos.${i}.ejemplo`,
        mensajes: p.ejemplo,
        botones: p.botones,
      });
    });
  }
  for (const b of bloques) {
    const salida = SalidaPepeSchema.safeParse({ mensajes: b.mensajes, botones: b.botones });
    if (!salida.success) {
      problemas.push(
        `${b.donde}: no cabe en un mensaje de Pepe (máx. 3 burbujas de 400 caracteres y 3 botones de 20)`,
      );
    }
    for (const m of b.mensajes) {
      const encontradas = frasesProhibidasEn(m, reto.prohibido_para_pepe);
      if (encontradas.length > 0) {
        problemas.push(`${b.donde}: contiene texto prohibido para Pepe (${encontradas.join(', ')})`);
      }
    }
    if (b.botones && new Set(b.botones).size !== b.botones.length) {
      problemas.push(`${b.donde}: botones repetidos`);
    }
  }

  // 2. Reglas de lectura.
  if (reto.requiere_lectura_voz && !reto.texto) {
    problemas.push('requiere_lectura_voz: no hay `texto` que leer');
  }
  if (reto.materia === 'matematicas' && reto.requiere_lectura_voz) {
    problemas.push('requiere_lectura_voz: solo aplica a retos de lectura');
  }
  if (reto.texto) {
    const palabras = contarPalabras(reto.texto.parrafos.join(' '));
    if (palabras < PALABRAS_TEXTO_MIN || palabras > PALABRAS_TEXTO_MAX) {
      problemas.push(
        `texto: tiene ${palabras} palabras; debe tener de ${PALABRAS_TEXTO_MIN} a ${PALABRAS_TEXTO_MAX}`,
      );
    }
  }

  // 3. El prerrequisito no puede ser el mismo concepto (haría un ciclo).
  if (reto.prerequisito === reto.concepto) {
    problemas.push('prerequisito: no puede ser el mismo concepto del reto');
  }

  return problemas;
}

export interface BancoValidado {
  retos: Reto[];
  /** Cosas que no impiden arrancar, pero que conviene arreglar. */
  advertencias: string[];
}

/** Valida un banco completo: cada reto, ids únicos y prerrequisitos existentes. */
export function validarBanco(entradas: { origen: string; datos: unknown }[]): BancoValidado {
  const retos: Reto[] = [];
  const problemas: string[] = [];

  for (const e of entradas) {
    try {
      retos.push(validarReto(e.datos, e.origen));
    } catch (err) {
      if (err instanceof RetoInvalidoError) problemas.push(err.message);
      else throw err;
    }
  }

  const vistos = new Map<string, string>();
  for (const [i, r] of retos.entries()) {
    const origen = entradas[i]?.origen ?? r.id;
    const previo = vistos.get(r.id);
    if (previo) problemas.push(`id repetido "${r.id}" en ${previo} y ${origen}`);
    vistos.set(r.id, origen);
  }

  if (problemas.length > 0) {
    throw new RetoInvalidoError('banco', problemas);
  }

  const conceptos = new Set(retos.map((r) => r.concepto));
  const advertencias = retos
    .filter((r) => r.prerequisito !== null && !conceptos.has(r.prerequisito))
    .map(
      (r) =>
        `${r.id}: su prerrequisito "${r.prerequisito}" no tiene retos en el banco (se usará un respaldo)`,
    );

  return { retos, advertencias };
}
