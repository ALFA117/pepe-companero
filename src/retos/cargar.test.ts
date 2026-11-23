import { describe, expect, it } from 'vitest';
import { frasesProhibidasEn } from '@/lib/texto';
import { NIVELES_AYUDA } from '@/motor/tipos';
import {
  RetoNoEncontradoError,
  advertenciasDelBanco,
  existeReto,
  listarRetos,
  obtenerReto,
} from './cargar';

describe('banco de retos', () => {
  it('carga y valida los retos del brief', () => {
    const ids = listarRetos().map((r) => r.id);
    expect(ids).toContain('mate-suma-fracciones-01');
    expect(ids).toContain('lectura-inferencia-causal-ajolote-01');
  });

  it('obtiene un reto por id', () => {
    expect(obtenerReto('mate-suma-fracciones-01').concepto).toBe('suma_fracciones_distinto_denominador');
    expect(existeReto('mate-suma-fracciones-01')).toBe(true);
  });

  it('lanza RetoNoEncontradoError con un id desconocido', () => {
    expect(() => obtenerReto('no-existe')).toThrow(RetoNoEncontradoError);
    expect(existeReto('no-existe')).toBe(false);
  });

  it('el reto de lectura pide la nota de voz y trae su texto', () => {
    const r = obtenerReto('lectura-inferencia-causal-ajolote-01');
    expect(r.requiere_lectura_voz).toBe(true);
    expect(r.texto?.parrafos).toHaveLength(2);
  });

  it('ningún planteamiento ni ejemplo de respaldo contiene la respuesta', () => {
    for (const reto of listarRetos()) {
      const textos = [
        ...reto.planteamiento_pepe,
        ...NIVELES_AYUDA.flatMap((n) => reto.niveles[n].pasos.flatMap((p) => p.ejemplo)),
      ];
      for (const t of textos) expect(frasesProhibidasEn(t, reto.prohibido_para_pepe)).toEqual([]);
    }
  });

  it('avisa de los prerrequisitos que todavía no tienen reto (se agregan en la Fase 7)', () => {
    expect(advertenciasDelBanco()).toEqual(
      expect.arrayContaining([
        expect.stringContaining('fracciones_equivalentes'),
        expect.stringContaining('localizar_informacion_literal'),
      ]),
    );
  });
});
