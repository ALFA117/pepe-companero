import { describe, expect, it } from 'vitest';
import { alinear, calcularFluidez, palabrasNormalizadas, type PalabraTranscrita } from './fluidez';

const TEXTO = 'El ajolote es un anfibio que solo vive en Xochimilco.';

/** Lee las palabras dadas a un ritmo fijo, con pausas opcionales antes de ciertos índices. */
function leer(palabras: string[], segPorPalabra = 0.4, pausas: Record<number, number> = {}): PalabraTranscrita[] {
  let t = 0.5;
  return palabras.map((palabra, i) => {
    t += pausas[i] ?? 0;
    const p = { palabra, inicio: t, fin: t + segPorPalabra * 0.8 };
    t += segPorPalabra;
    return p;
  });
}

describe('palabrasNormalizadas', () => {
  it('quita acentos, puntuación y mayúsculas', () => {
    expect(palabrasNormalizadas('¡Él vivió, en México!')).toEqual(['el', 'vivio', 'en', 'mexico']);
  });
});

describe('alinear', () => {
  it('lectura idéntica', () => {
    expect(alinear(['a', 'b', 'c'], ['a', 'b', 'c'])).toEqual({ coincidencias: 3, alcanzadas: 3 });
  });

  it('palabra omitida', () => {
    expect(alinear(['a', 'b', 'c', 'd'], ['a', 'c', 'd'])).toEqual({ coincidencias: 3, alcanzadas: 4 });
  });

  it('palabra insertada', () => {
    expect(alinear(['a', 'b', 'c'], ['a', 'eh', 'b', 'c'])).toEqual({ coincidencias: 3, alcanzadas: 3 });
  });

  it('se detuvo a la mitad', () => {
    expect(alinear(['a', 'b', 'c', 'd', 'e', 'f'], ['a', 'b', 'c'])).toEqual({ coincidencias: 3, alcanzadas: 3 });
  });

  it('palabra sustituida', () => {
    expect(alinear(['a', 'b', 'c'], ['a', 'x', 'c'])).toEqual({ coincidencias: 2, alcanzadas: 3 });
  });

  it('nada leído', () => {
    expect(alinear(['a', 'b'], [])).toEqual({ coincidencias: 0, alcanzadas: 0 });
  });
});

describe('calcularFluidez', () => {
  const palabrasTexto = palabrasNormalizadas(TEXTO);

  it('lectura perfecta', () => {
    const m = calcularFluidez(TEXTO, leer(TEXTO.replace(/[.,]/g, '').split(' ')));
    expect(m).toMatchObject({
      palabras_texto: 10,
      palabras_correctas_est: 10,
      precision_est: 1,
      pausas_largas: 0,
    });
    // 10 palabras en 0.4 s cada una (última termina antes): ~3.92 s → ~153 ppm
    expect(m!.duracion_voz_s).toBeCloseTo(3.92, 2);
    expect(m!.ppm).toBeCloseTo(153.1, 0);
  });

  it('con palabras omitidas baja la precisión pero cuenta hasta dónde llegó', () => {
    const leidas = palabrasTexto.filter((_, i) => i !== 2 && i !== 5);
    const m = calcularFluidez(TEXTO, leer(leidas));
    expect(m).toMatchObject({ palabras_correctas_est: 8, precision_est: 0.8 });
  });

  it('cuenta las pausas de más de 2 segundos', () => {
    const m = calcularFluidez(TEXTO, leer(palabrasTexto, 0.4, { 3: 2.5, 7: 3 }));
    expect(m!.pausas_largas).toBe(2);
    expect(m!.ppm).toBeLessThan(80);
  });

  it('una pausa de 2 segundos o menos no cuenta', () => {
    expect(calcularFluidez(TEXTO, leer(palabrasTexto, 0.4, { 3: 1.5 }))!.pausas_largas).toBe(0);
  });

  it('si se detiene a la mitad, ppm usa solo lo que alcanzó a leer', () => {
    const completa = calcularFluidez(TEXTO, leer(palabrasTexto))!;
    const mitad = calcularFluidez(TEXTO, leer(palabrasTexto.slice(0, 5)))!;
    expect(mitad.precision_est).toBe(0.5);
    expect(mitad.ppm).toBeGreaterThan(completa.ppm * 0.9);
  });

  it('no depende del orden en que lleguen las palabras', () => {
    const p = leer(palabrasTexto);
    expect(calcularFluidez(TEXTO, [...p].reverse())).toEqual(calcularFluidez(TEXTO, p));
  });

  it('sin palabras devuelve null', () => {
    expect(calcularFluidez(TEXTO, [])).toBeNull();
    expect(calcularFluidez('', leer(['hola']))).toBeNull();
  });
});
