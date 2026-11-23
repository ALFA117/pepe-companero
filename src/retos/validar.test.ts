import { describe, expect, it } from 'vitest';
import { retoSintetico } from '@/test/fabricas';
import { RetoInvalidoError, validarBanco, validarReto } from './validar';

/** Texto de lectura con el número de palabras pedido. */
function textoDe(palabras: number) {
  return { titulo: 't', parrafos: [Array.from({ length: palabras }, () => 'palabra').join(' ')] };
}

function problemas(fn: () => unknown): string[] {
  try {
    fn();
  } catch (e) {
    if (e instanceof RetoInvalidoError) return e.problemas;
    throw e;
  }
  return [];
}

describe('validarReto', () => {
  it('acepta un reto válido', () => {
    expect(validarReto(retoSintetico({ id: 'ok' })).id).toBe('ok');
  });

  it('rechaza lo que no cumple el esquema e indica dónde', () => {
    const p = problemas(() => validarReto({ ...retoSintetico({ id: 'x' }), dificultad: 5 }, 'x.json'));
    expect(p.some((m) => m.startsWith('dificultad'))).toBe(true);
  });

  it('rechaza ids con mayúsculas o espacios', () => {
    expect(problemas(() => validarReto(retoSintetico({ id: 'Mi Reto' })))).not.toEqual([]);
  });

  it('rechaza un ejemplo que contiene una frase prohibida (es el respaldo de Pepe)', () => {
    const reto = retoSintetico({ id: 'x' });
    reto.niveles['2'] = {
      objetivo: 'o',
      pasos: [{ objetivo: 'o', ejemplo: ['Es la RESPUESTA  secreta, ¿ves?'] }],
    };
    const p = problemas(() => validarReto(reto));
    expect(p).toEqual([expect.stringContaining('niveles.2.pasos.0.ejemplo: contiene texto prohibido')]);
  });

  it('rechaza un planteamiento que contiene una frase prohibida', () => {
    const p = problemas(() =>
      validarReto(retoSintetico({ id: 'x', planteamiento_pepe: ['te digo la respuesta secreta'] })),
    );
    expect(p[0]).toContain('planteamiento_pepe');
  });

  it('rechaza un ejemplo con más de 3 burbujas', () => {
    const reto = retoSintetico({ id: 'x' });
    reto.niveles['1'] = { objetivo: 'o', pasos: [{ objetivo: 'o', ejemplo: ['a', 'b', 'c', 'd'] }] };
    expect(problemas(() => validarReto(reto))[0]).toContain('no cabe en un mensaje');
  });

  it('rechaza botones de más de 20 caracteres o más de 3 botones', () => {
    const largo = retoSintetico({ id: 'x' });
    largo.niveles['1'] = {
      objetivo: 'o',
      pasos: [{ objetivo: 'o', ejemplo: ['a'], botones: ['x'.repeat(21)] }],
    };
    expect(problemas(() => validarReto(largo))).not.toEqual([]);

    const muchos = retoSintetico({ id: 'y' });
    muchos.niveles['1'] = {
      objetivo: 'o',
      pasos: [{ objetivo: 'o', ejemplo: ['a'], botones: ['1', '2', '3', '4'] }],
    };
    expect(problemas(() => validarReto(muchos))).not.toEqual([]);
  });

  it('rechaza botones repetidos', () => {
    const reto = retoSintetico({ id: 'x' });
    reto.niveles['1'] = { objetivo: 'o', pasos: [{ objetivo: 'o', ejemplo: ['a'], botones: ['Sí', 'Sí'] }] };
    expect(problemas(() => validarReto(reto))).toEqual(['niveles.1.pasos.0.ejemplo: botones repetidos']);
  });

  it('exige texto en retos de lectura', () => {
    expect(problemas(() => validarReto(retoSintetico({ id: 'x', materia: 'lectura' })))).not.toEqual([]);
  });

  it('exige de 70 a 110 palabras en el texto de lectura', () => {
    const base = { id: 'x', materia: 'lectura' as const, requiere_lectura_voz: true };
    expect(problemas(() => validarReto(retoSintetico({ ...base, texto: textoDe(69) })))[0]).toContain(
      'tiene 69 palabras',
    );
    expect(problemas(() => validarReto(retoSintetico({ ...base, texto: textoDe(111) })))).not.toEqual([]);
    expect(problemas(() => validarReto(retoSintetico({ ...base, texto: textoDe(70) })))).toEqual([]);
    expect(problemas(() => validarReto(retoSintetico({ ...base, texto: textoDe(110) })))).toEqual([]);
  });

  it('no permite lectura en voz alta en matemáticas', () => {
    const p = problemas(() =>
      validarReto(retoSintetico({ id: 'x', requiere_lectura_voz: true, texto: textoDe(80) })),
    );
    expect(p).toEqual(['requiere_lectura_voz: solo aplica a retos de lectura']);
  });

  it('no permite que el prerrequisito sea el mismo concepto', () => {
    const p = problemas(() => validarReto(retoSintetico({ id: 'x', prerequisito: 'concepto_a' })));
    expect(p).toEqual(['prerequisito: no puede ser el mismo concepto del reto']);
  });

  it('junta todos los problemas en un solo error', () => {
    const reto = retoSintetico({ id: 'x', prerequisito: 'concepto_a', planteamiento_pepe: ['respuesta secreta'] });
    expect(problemas(() => validarReto(reto))).toHaveLength(2);
  });
});

describe('validarBanco', () => {
  it('rechaza ids repetidos', () => {
    const p = problemas(() =>
      validarBanco([
        { origen: 'a.json', datos: retoSintetico({ id: 'igual' }) },
        { origen: 'b.json', datos: retoSintetico({ id: 'igual' }) },
      ]),
    );
    expect(p).toEqual(['id repetido "igual" en a.json y b.json']);
  });

  it('reporta los errores de todos los archivos juntos', () => {
    const p = problemas(() =>
      validarBanco([
        { origen: 'a.json', datos: { id: 'a' } },
        { origen: 'b.json', datos: { id: 'b' } },
      ]),
    );
    expect(p).toHaveLength(2);
    expect(p[0]).toContain('a.json');
    expect(p[1]).toContain('b.json');
  });

  it('advierte (sin fallar) cuando un prerrequisito no tiene retos', () => {
    const { retos, advertencias } = validarBanco([
      { origen: 'a.json', datos: retoSintetico({ id: 'a', prerequisito: 'no_existe' }) },
      { origen: 'b.json', datos: retoSintetico({ id: 'b', concepto: 'concepto_b', prerequisito: 'concepto_a' }) },
    ]);
    expect(retos).toHaveLength(2);
    expect(advertencias).toEqual([expect.stringContaining('a: su prerrequisito "no_existe"')]);
  });
});
