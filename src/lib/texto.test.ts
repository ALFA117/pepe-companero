import { describe, expect, it } from 'vitest';
import { contarPalabras, frasesProhibidasEn, normalizar } from './texto';

describe('normalizar', () => {
  it('quita acentos, pasa a minúsculas y colapsa espacios', () => {
    expect(normalizar('  Denominador   COMÚN\n')).toBe('denominador comun');
  });

  it('convierte la ñ en n', () => {
    expect(normalizar('Niño')).toBe('nino');
  });
});

describe('frasesProhibidasEn', () => {
  const prohibidas = ['5/6', 'denominador común', '3/6 + 2/6'];

  it('detecta frases sin importar acentos, mayúsculas ni espacios extra', () => {
    expect(frasesProhibidasEn('Usa el DENOMINADOR   comun, porfa', prohibidas)).toEqual([
      'denominador común',
    ]);
  });

  it('detecta varias a la vez', () => {
    expect(frasesProhibidasEn('3/6 + 2/6 = 5/6', prohibidas)).toEqual(['5/6', '3/6 + 2/6']);
  });

  it('devuelve vacío si el texto está limpio', () => {
    expect(frasesProhibidasEn('¿Cuántos pedacitos son?', prohibidas)).toEqual([]);
  });

  it('no se deja engañar por espacios alrededor de operadores ni barras Unicode', () => {
    expect(frasesProhibidasEn('creo que da 5 / 6', ['5/6'])).toEqual(['5/6']);
    expect(frasesProhibidasEn('creo que da 5⁄6', ['5/6'])).toEqual(['5/6']);
    expect(frasesProhibidasEn('entonces x =5', ['x = 5'])).toEqual(['x = 5']);
    expect(frasesProhibidasEn('3/6+2/6', ['3/6 + 2/6'])).toEqual(['3/6 + 2/6']);
  });

  it('no confunde números más grandes', () => {
    expect(frasesProhibidasEn('3x + 5 = 20', ['x = 5'])).toEqual([]);
  });

  it('ignora frases prohibidas vacías', () => {
    expect(frasesProhibidasEn('hola', ['   '])).toEqual([]);
  });
});

describe('contarPalabras', () => {
  it('cuenta palabras separadas por cualquier espacio', () => {
    expect(contarPalabras(' uno  dos\ntres ')).toBe(3);
  });

  it('un texto vacío tiene 0 palabras', () => {
    expect(contarPalabras('   ')).toBe(0);
  });
});
