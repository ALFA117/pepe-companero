import { describe, expect, it } from 'vitest';
import { revisarSalida } from './filtro';

const prohibidas = ['5/6', 'denominador común', '3/6 + 2/6'];

describe('filtro anti-respuesta', () => {
  it('deja pasar un mensaje limpio', () => {
    expect(revisarSalida({ mensajes: ['¿Cuántos pedacitos son?'] }, prohibidas, 'nivel')).toEqual({
      limpio: true,
      encontradas: [],
    });
  });

  it('bloquea la respuesta en cualquier burbuja', () => {
    const r = revisarSalida({ mensajes: ['Va', 'Creo que da 5/6'] }, prohibidas, 'nivel');
    expect(r).toEqual({ limpio: false, encontradas: ['5/6'] });
  });

  it('compara sin acentos, mayúsculas ni espacios extra', () => {
    const r = revisarSalida({ mensajes: ['Busquemos un DENOMINADOR   comun'] }, prohibidas, 'nivel');
    expect(r.encontradas).toEqual(['denominador común']);
  });

  it('también revisa los botones', () => {
    const r = revisarSalida({ mensajes: ['¿Cuál?'], botones: ['5/6', '2/5'] }, prohibidas, 'nivel');
    expect(r.limpio).toBe(false);
  });

  it('no repite frases encontradas varias veces', () => {
    const r = revisarSalida({ mensajes: ['5/6', 'sí, 5/6'] }, prohibidas, 'nivel');
    expect(r.encontradas).toEqual(['5/6']);
  });

  it('no aplica en cierre ni en terminado (el alumno ya resolvió)', () => {
    for (const fase of ['cierre', 'terminado'] as const) {
      expect(revisarSalida({ mensajes: ['¡Sí, era 5/6!'] }, prohibidas, fase).limpio).toBe(true);
    }
  });

  it('sí aplica en leyendo_texto y pendiente', () => {
    for (const fase of ['leyendo_texto', 'pendiente'] as const) {
      expect(revisarSalida({ mensajes: ['5/6'] }, prohibidas, fase).limpio).toBe(false);
    }
  });
});
