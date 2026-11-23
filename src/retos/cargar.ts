/**
 * Banco de retos. Los JSON se importan de forma estática para que Next.js los
 * incluya en el bundle (sin leer el disco en Vercel) y se validan una sola vez,
 * al cargar el módulo: si un reto está mal, truena al arrancar y no a media demo.
 *
 * Para agregar un reto: crea `banco/<id>.json` y agrégalo a `ARCHIVOS`.
 */
import type { Reto } from '@/motor/tipos';
import { validarBanco } from './validar';

import lecturaIdeaPrincipal01 from './banco/lectura-idea-principal-01.json';
import lecturaInferenciaCausalAjolote01 from './banco/lectura-inferencia-causal-ajolote-01.json';
import lecturaLocalizarInformacion01 from './banco/lectura-localizar-informacion-01.json';
import lecturaSecuenciaHechos01 from './banco/lectura-secuencia-hechos-01.json';
import lecturaVocabularioContexto01 from './banco/lectura-vocabulario-contexto-01.json';
import mateEcuacionesPrimerGrado01 from './banco/mate-ecuaciones-primer-grado-01.json';
import mateFraccionesEquivalentes01 from './banco/mate-fracciones-equivalentes-01.json';
import mateJerarquiaOperaciones01 from './banco/mate-jerarquia-operaciones-01.json';
import matePorcentajes01 from './banco/mate-porcentajes-01.json';
import mateSumaFracciones01 from './banco/mate-suma-fracciones-01.json';

const ARCHIVOS: { origen: string; datos: unknown }[] = [
  { origen: 'lectura-idea-principal-01.json', datos: lecturaIdeaPrincipal01 },
  { origen: 'lectura-inferencia-causal-ajolote-01.json', datos: lecturaInferenciaCausalAjolote01 },
  { origen: 'lectura-localizar-informacion-01.json', datos: lecturaLocalizarInformacion01 },
  { origen: 'lectura-secuencia-hechos-01.json', datos: lecturaSecuenciaHechos01 },
  { origen: 'lectura-vocabulario-contexto-01.json', datos: lecturaVocabularioContexto01 },
  { origen: 'mate-ecuaciones-primer-grado-01.json', datos: mateEcuacionesPrimerGrado01 },
  { origen: 'mate-fracciones-equivalentes-01.json', datos: mateFraccionesEquivalentes01 },
  { origen: 'mate-jerarquia-operaciones-01.json', datos: mateJerarquiaOperaciones01 },
  { origen: 'mate-porcentajes-01.json', datos: matePorcentajes01 },
  { origen: 'mate-suma-fracciones-01.json', datos: mateSumaFracciones01 },
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
