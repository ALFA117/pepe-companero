import { describe, expect, it } from 'vitest';
import { EvaluacionTurnoSchema, RetoSchema, SalidaPepeSchema } from './tipos';

const paso = { objetivo: 'o', ejemplo: ['e'] };
const nivel = { objetivo: 'o', pasos: [paso] };
const retoBase = {
  id: 'mate-prueba-01',
  materia: 'matematicas',
  grado: '1_secundaria',
  concepto: 'c',
  dificultad: 1,
  prerequisito: null,
  planteamiento_pepe: ['hola'],
  error_plantado: 'e',
  solucion_para_juez: 's',
  prohibido_para_pepe: ['5/6'],
  rubrica: { correcta: 'c', parcial: 'p', incorrecta: 'i', evidencia_minima_cierre: 'e' },
  niveles: { '1': nivel, '2': nivel, '3': nivel, '4': nivel },
};

describe('contrato del motor', () => {
  it('acepta un reto de matemáticas válido', () => {
    expect(RetoSchema.safeParse(retoBase).success).toBe(true);
  });

  it('exige texto en los retos de lectura', () => {
    expect(RetoSchema.safeParse({ ...retoBase, materia: 'lectura' }).success).toBe(false);
  });

  it('rechaza botones de más de 20 caracteres', () => {
    const r = SalidaPepeSchema.safeParse({ mensajes: ['hola'], botones: ['x'.repeat(21)] });
    expect(r.success).toBe(false);
  });

  it('rechaza más de 3 burbujas de Pepe', () => {
    expect(SalidaPepeSchema.safeParse({ mensajes: ['a', 'b', 'c', 'd'] }).success).toBe(false);
  });

  it('valida la salida del Juez', () => {
    const r = EvaluacionTurnoSchema.safeParse({
      clasificacion: 'parcial',
      detecto_error: true,
      explica_por_que: 'no',
      usa_evidencia_textual: null,
      conceptos_demostrados: [],
      brecha_probable: 'fracciones_equivalentes',
      comentario_docente: 'Nota que 2/5 es poco, no sabe por qué.',
      confianza: 0.8,
    });
    expect(r.success).toBe(true);
  });
});
