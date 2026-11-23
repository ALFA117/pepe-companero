import { describe, expect, it } from 'vitest';
import { retoSintetico } from '@/test/fabricas';
import { elegirSiguienteReto } from './siguiente';

const actual = retoSintetico({ id: 'suma-1', concepto: 'suma', dificultad: 2, prerequisito: 'equivalentes' });

const banco = [
  actual,
  retoSintetico({ id: 'suma-1b', concepto: 'suma', dificultad: 2 }),
  retoSintetico({ id: 'suma-3', concepto: 'suma', dificultad: 3 }),
  retoSintetico({ id: 'suma-1-facil', concepto: 'suma', dificultad: 1 }),
  retoSintetico({ id: 'equiv-1', concepto: 'equivalentes', dificultad: 1 }),
  retoSintetico({ id: 'equiv-2', concepto: 'equivalentes', dificultad: 2 }),
  retoSintetico({ id: 'porcentajes-2', concepto: 'porcentajes', dificultad: 2 }),
  retoSintetico({ id: 'porcentajes-3', concepto: 'porcentajes', dificultad: 3 }),
  retoSintetico({
    id: 'lectura-1',
    materia: 'lectura',
    concepto: 'suma',
    dificultad: 3,
    texto: { titulo: 't', parrafos: ['p'] },
  }),
];

const sinAyuda = { nivel_max: 0, requiere_docente: false };
const conAyuda = { nivel_max: 2, requiere_docente: false };
const nivel4 = { nivel_max: 4, requiere_docente: false };
const atorado = { nivel_max: 4, requiere_docente: true };

describe('elegirSiguienteReto', () => {
  describe('resolvió sin ayuda (nivel_max = 0)', () => {
    it('sube de dificultad en el mismo concepto', () => {
      expect(elegirSiguienteReto(actual, sinAyuda, banco)).toBe('suma-3');
    });

    it('si no hay uno más difícil, da otro de la misma dificultad', () => {
      expect(elegirSiguienteReto(actual, sinAyuda, banco, ['suma-3'])).toBe('suma-1b');
    });

    it('si se acabó el concepto, sube en otra parte de la misma materia', () => {
      expect(elegirSiguienteReto(actual, sinAyuda, banco, ['suma-3', 'suma-1b'])).toBe('porcentajes-3');
    });
  });

  describe('necesitó algo de ayuda (niveles 1 a 3)', () => {
    it('practica el mismo concepto y la misma dificultad', () => {
      expect(elegirSiguienteReto(actual, conAyuda, banco)).toBe('suma-1b');
    });

    it('si no hay, otro del mismo concepto (el más fácil primero)', () => {
      expect(elegirSiguienteReto(actual, conAyuda, banco, ['suma-1b'])).toBe('suma-1-facil');
    });

    it('si se acabó el concepto, otro de la misma materia y dificultad', () => {
      expect(elegirSiguienteReto(actual, conAyuda, banco, ['suma-1b', 'suma-1-facil', 'suma-3'])).toBe(
        'equiv-2',
      );
    });

    it('nunca cambia de materia aunque el concepto coincida', () => {
      const soloLectura = [actual, banco[8]!];
      expect(elegirSiguienteReto(actual, conAyuda, soloLectura)).toBeNull();
    });
  });

  describe('llegó al nivel 4 o requiere docente', () => {
    it('baja al prerrequisito (el más fácil primero)', () => {
      expect(elegirSiguienteReto(actual, atorado, banco)).toBe('equiv-1');
      expect(elegirSiguienteReto(actual, nivel4, banco)).toBe('equiv-1');
    });

    it('sin prerrequisito disponible, algo más fácil del mismo concepto', () => {
      expect(elegirSiguienteReto(actual, atorado, banco, ['equiv-1', 'equiv-2'])).toBe('suma-1-facil');
    });

    it('nunca sube de dificultad', () => {
      const soloDificiles = [actual, banco[2]!, banco[7]!];
      expect(elegirSiguienteReto(actual, atorado, soloDificiles)).toBeNull();
    });

    it('sin prerrequisito declarado usa los respaldos', () => {
      const sinPrereq = { ...actual, prerequisito: null };
      expect(elegirSiguienteReto(sinPrereq, atorado, banco)).toBe('suma-1-facil');
    });
  });

  it('nunca repite el reto actual', () => {
    expect(elegirSiguienteReto(actual, conAyuda, [actual])).toBeNull();
  });

  it('es determinista (misma entrada, misma salida)', () => {
    const desordenado = [...banco].reverse();
    expect(elegirSiguienteReto(actual, conAyuda, desordenado)).toBe(elegirSiguienteReto(actual, conAyuda, banco));
  });
});
