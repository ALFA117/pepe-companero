/**
 * Banco de retos. Los JSON se importan de forma estática para que Next.js los
 * incluya en el bundle (sin leer el disco en Vercel) y se validan una sola vez,
 * al cargar el módulo: si un reto está mal, truena al arrancar y no a media demo.
 *
 * Para agregar un reto: crea `banco/<id>.json` y agrégalo a `ARCHIVOS`.
 */
import type { Reto } from '@/motor/tipos';
import { validarBanco } from './validar';

import lecturaInferenciaCausalAjolote01 from './banco/lectura-inferencia-causal-ajolote-01.json';
import mateSumaFracciones01 from './banco/mate-suma-fracciones-01.json';

const ARCHIVOS: { origen: string; datos: unknown }[] = [
  { origen: 'mate-suma-fracciones-01.json', datos: mateSumaFracciones01 },
  { origen: 'lectura-inferencia-causal-ajolote-01.json', datos: lecturaInferenciaCausalAjolote01 },
];

const banco = validarBanco(ARCHIVOS);
const porId = new Map(banco.retos.map((r) => [r.id, r]));

export class RetoNoEncontradoError extends Error {
  constructor(readonly id: string) {
    super(`No existe el reto "${id}"`);
    this.name = 'RetoNoEncontradoError';
  }
}

/** Todos los retos del banco, ya validados. */
export function listarRetos(): readonly Reto[] {
  return banco.retos;
}

/** Un reto por id. Lanza `RetoNoEncontradoError` si no existe. */
export function obtenerReto(id: string): Reto {
  const reto = porId.get(id);
  if (!reto) throw new RetoNoEncontradoError(id);
  return reto;
}

export function existeReto(id: string): boolean {
  return porId.has(id);
}

/** Advertencias del banco (p. ej. prerrequisitos sin retos todavía). */
export function advertenciasDelBanco(): readonly string[] {
  return banco.advertencias;
}
