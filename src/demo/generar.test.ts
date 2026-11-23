import { describe, expect, it } from 'vitest';
import { RepositorioMemoria, datosIniciales, sembrarDemo } from '@/db/memoria';
import { calcularPanel, infoDeRetos } from '@/panel/calcular';
import { listarRetos } from '@/retos/cargar';
import { ALUMNOS_DEMO, GRUPO_DEMO_ID, generarDemo } from './generar';

const AHORA = new Date('2026-11-24T18:00:00Z');

describe('datos de demo', () => {
  const demo = generarDemo({ banco: listarRetos(), ahora: AHORA });

  it('45 alumnos ficticios con códigos únicos', () => {
    expect(demo.alumnos).toHaveLength(ALUMNOS_DEMO);
    expect(new Set(demo.alumnos.map((a) => a.codigo)).size).toBe(ALUMNOS_DEMO);
    expect(demo.grupo).toMatchObject({ id: GRUPO_DEMO_ID, es_demo: true });
  });

  it('es determinista', () => {
    expect(generarDemo({ banco: listarRetos(), ahora: AHORA })).toEqual(demo);
  });

  it('cada alumno tiene como mucho una sesión activa (como exige la base)', () => {
    const activas = new Map<string, number>();
    for (const s of demo.sesiones) if (s.fase !== 'terminado') activas.set(s.alumno_id, (activas.get(s.alumno_id) ?? 0) + 1);
    expect(Math.max(0, ...activas.values())).toBeLessThanOrEqual(1);
  });

  it('todo cae dentro de la última semana y respeta los rangos', () => {
    const desde = AHORA.getTime() - 7 * 86400_000;
    for (const s of demo.sesiones) {
      expect(new Date(s.creado_en).getTime()).toBeGreaterThanOrEqual(desde);
      expect(s.nivel_max).toBeGreaterThanOrEqual(0);
      expect(s.nivel_max).toBeLessThanOrEqual(4);
    }
    for (const f of demo.fluidez) expect(f.precision_est).toBeLessThanOrEqual(1);
  });

  it('llena el panel: brechas, gente que necesita atención y fluidez', () => {
    const datos = datosIniciales();
    sembrarDemo(datos, demo);
    const repo = new RepositorioMemoria(datos);
    return repo.datosPanel(GRUPO_DEMO_ID).then((d) => {
      const r = calcularPanel(d!, infoDeRetos(listarRetos()), AHORA);
      expect(r.indicadores.activos).toBeGreaterThan(30);
      expect(r.brechas).toHaveLength(4);
      expect(r.atencion.length).toBeGreaterThan(0);
      expect(r.mediana_ppm).not.toBeNull();
    });
  });
});
