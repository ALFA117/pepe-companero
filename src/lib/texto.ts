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
 * Devuelve las frases prohibidas que aparecen en el texto, comparando
 * de forma normalizada. Un arreglo vacío significa que el texto está limpio.
 */
export function frasesProhibidasEn(texto: string, prohibidas: readonly string[]): string[] {
  const t = normalizar(texto);
  return prohibidas.filter((p) => {
    const n = normalizar(p);
    return n.length > 0 && t.includes(n);
  });
}

/** Cuenta palabras (secuencias separadas por espacios). */
export function contarPalabras(texto: string): number {
  const t = texto.trim();
  return t === '' ? 0 : t.split(/\s+/).length;
}
