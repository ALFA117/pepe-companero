/**
 * Utilidades de texto compartidas por el validador de retos, el filtro
 * anti-respuesta y el cálculo de fluidez.
 */

/** Minúsculas, sin acentos (ñ → n) y con los espacios colapsados. */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalización para el filtro anti-respuesta: además de `normalizar`, une
 * los operadores con sus números ("5 / 6" → "5/6", "x =5" → "x=5") y
 * convierte la barra de fracción Unicode ("5⁄6") en "/".
 */
export function normalizarParaFiltro(texto: string): string {
  return normalizar(texto)
    .replace(/[\u2044\u2215\u00f7]/g, '/')
    .replace(/[\u00d7\u2715\u2a09]/g, '×')
    .replace(/\s*([/=+×*])\s*/g, '$1')
    .replace(/(\d)\s*-\s*(\d)/g, '$1-$2');
}

/**
 * Devuelve las frases prohibidas que aparecen en el texto, comparando
 * de forma normalizada. Un arreglo vacío significa que el texto está limpio.
 */
export function frasesProhibidasEn(texto: string, prohibidas: readonly string[]): string[] {
  const t = normalizarParaFiltro(texto);
  return prohibidas.filter((p) => {
    const n = normalizarParaFiltro(p);
    return n.length > 0 && t.includes(n);
  });
}

/** Cuenta palabras (secuencias separadas por espacios). */
export function contarPalabras(texto: string): number {
  const t = texto.trim();
  return t === '' ? 0 : t.split(/\s+/).length;
}
