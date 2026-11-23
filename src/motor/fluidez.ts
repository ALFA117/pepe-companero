/**
 * Métricas de fluidez lectora (sección 7 del brief), a partir de las palabras
 * transcritas con marcas de tiempo. Función pura.
 *
 * La precisión es ESTIMADA: la transcripción tiende a "corregir" lo que el
 * alumno leyó mal, así que la UI tiene que decirlo así.
 * Estas métricas las ve el maestro, nunca el alumno.
 */
import type { MetricasFluidez } from '@/db/repositorio';

export interface PalabraTranscrita {
  palabra: string;
  /** Segundos desde el inicio del audio. */
  inicio: number;
  fin: number;
}

export const PAUSA_LARGA_S = 2;

/** Minúsculas, sin acentos ni puntuación, partido en palabras. */
export function palabrasNormalizadas(texto: string): string[] {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

export interface Alineacion {
  /** Palabras del texto leídas igual. */
  coincidencias: number;
  /** Índice (base 1) de la última palabra del texto que se alcanzó a leer. */
  alcanzadas: number;
}

/**
 * Alineación palabra por palabra con distancia de Levenshtein
 * (sustitución, omisión e inserción cuestan 1). Devuelve las coincidencias
 * del camino óptimo y hasta qué palabra del texto llegó el alumno.
 */
export function alinear(texto: readonly string[], leido: readonly string[]): Alineacion {
  const n = texto.length;
  const m = leido.length;
  // dp[i][j] = distancia entre texto[0..i) y leido[0..j)
  const dp: number[][] = Array.from({ length: n + 1 }, (_, i) =>
    Array.from({ length: m + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const igual = texto[i - 1] === leido[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(dp[i - 1]![j - 1]! + igual, dp[i - 1]![j]! + 1, dp[i]![j - 1]! + 1);
    }
  }

  // Reconstruir el camino desde el final.
  let i = n;
  let j = m;
  let coincidencias = 0;
  let alcanzadas = 0;
  while (i > 0 && j > 0) {
    const igual = texto[i - 1] === leido[j - 1] ? 0 : 1;
    if (dp[i]![j] === dp[i - 1]![j - 1]! + igual) {
      if (igual === 0) coincidencias++;
      alcanzadas = Math.max(alcanzadas, i);
      i--;
      j--;
    } else if (dp[i]![j] === dp[i - 1]![j]! + 1) {
      i--; // palabra del texto omitida
    } else {
      j--; // palabra de más
    }
  }
  return { coincidencias, alcanzadas };
}

/**
 * Calcula las métricas. Devuelve null si no hay palabras con tiempo
 * (audio vacío o sin voz): en ese caso no se guardan métricas.
 */
export function calcularFluidez(
  textoOriginal: string,
  palabras: readonly PalabraTranscrita[],
): MetricasFluidez | null {
  const ordenadas = [...palabras].sort((a, b) => a.inicio - b.inicio);
  const primera = ordenadas[0];
  const ultima = ordenadas[ordenadas.length - 1];
  const texto = palabrasNormalizadas(textoOriginal);
  if (!primera || !ultima || texto.length === 0) return null;

  const leido = ordenadas.flatMap((p) => palabrasNormalizadas(p.palabra));
  const { coincidencias, alcanzadas } = alinear(texto, leido);

  const duracion = Math.max(0, ultima.fin - primera.inicio);
  let pausas = 0;
  for (let k = 1; k < ordenadas.length; k++) {
    if (ordenadas[k]!.inicio - ordenadas[k - 1]!.fin > PAUSA_LARGA_S) pausas++;
  }

  const redondear = (x: number, d: number) => Math.round(x * 10 ** d) / 10 ** d;
  return {
    palabras_texto: texto.length,
    palabras_correctas_est: coincidencias,
    duracion_voz_s: redondear(duracion, 2),
    ppm: duracion > 0 ? redondear(alcanzadas / (duracion / 60), 1) : 0,
    pausas_largas: pausas,
    precision_est: redondear(coincidencias / texto.length, 3),
  };
}
