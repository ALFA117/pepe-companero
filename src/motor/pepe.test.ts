import { describe, expect, it } from 'vitest';
import { normalizar } from '@/lib/texto';
import { obtenerReto } from '@/retos/cargar';
import { enNivel } from '@/test/fabricas';
import { esperar, llmFalso } from '@/test/llm-falso';
import { pasosDelNivel } from './maquina';
import {
  FRASE_NO_SE_LA_RESPUESTA,
  construirPromptPepe,
  mensajesFijos,
  redactar,
  respaldo,
  retoParaPepe,
  type EntradaPepe,
} from './pepe';
import type { AccionPepe, Reto } from './tipos';

const mate = obtenerReto('mate-suma-fracciones-01');
const lectura = obtenerReto('lectura-inferencia-causal-ajolote-01');

const guiar = (nivel: number, paso: number, extra: Partial<Extract<AccionPepe, { tipo: 'guiar' }>> = {}): AccionPepe => ({
  tipo: 'guiar',
  nivel,
  paso,
  cambio_de_nivel: paso === 0,
  motivo: 'no_se',
  pidio_respuesta: false,
  atajo: false,
  ...extra,
});

function entrada(reto: Reto, nivel: number, paso: number, accion: AccionPepe, fase?: 'cierre'): EntradaPepe {
  return {
    reto,
    sesion: { ...enNivel(reto, nivel, paso), ...(fase ? { fase } : {}) },
    accion,
    historial: [
      { rol: 'pepe', texto: reto.planteamiento_pepe.join(' ') },
      { rol: 'alumno', texto: 'no sé' },
    ],
    ultimo_mensaje_alumno: 'ya dime la respuesta',
  };
}

describe('Pepe nunca ve la solución', () => {
  it('retoParaPepe no incluye la solución, la rúbrica ni lo prohibido', () => {
    const p = retoParaPepe(mate) as unknown as Record<string, unknown>;
    expect(p).not.toHaveProperty('solucion_para_juez');
    expect(p).not.toHaveProperty('rubrica');
    expect(p).not.toHaveProperty('prohibido_para_pepe');
  });

  it.each([mate, lectura])('ningún prompt de $id contiene la solución, la rúbrica ni frases prohibidas', (reto) => {
    const secretos = [
      reto.solucion_para_juez,
      reto.rubrica.correcta,
      reto.rubrica.parcial,
      reto.rubrica.incorrecta,
      reto.rubrica.evidencia_minima_cierre,
      ...reto.prohibido_para_pepe,
    ].map(normalizar);

    const acciones: [number, number, AccionPepe][] = [
      [0, 0, { tipo: 'pedir_justificacion' }],
      [0, 0, { tipo: 'regresar_al_reto' }],
      [0, 0, { tipo: 'pedir_explicacion' }],
    ];
    for (let n = 1; n <= 4; n++) {
      for (let p = 0; p < pasosDelNivel(reto, n); p++) {
        acciones.push([n, p, guiar(n, p)], [n, p, guiar(n, p, { pidio_respuesta: true })], [n, p, { tipo: 'regresar_al_reto' }]);
      }
    }
    for (const [n, p, accion] of acciones) {
      for (const estricto of [false, true]) {
        const { instrucciones, prompt } = construirPromptPepe(entrada(reto, n, p, accion), estricto);
        const todo = normalizar(`${instrucciones}\n${prompt}`);
        for (const s of secretos) expect(todo).not.toContain(s);
      }
    }
  });

  it('el prompt incluye el objetivo y el ejemplo del paso actual', () => {
    const { prompt } = construirPromptPepe(entrada(mate, 2, 1, guiar(2, 1)));
    expect(prompt).toContain('¿2/5 es más o menos que media pizza?');
    expect(prompt).toContain('Eso pensé. Ahora, 2/5 es partir la pizza en 5 rebanadas y comerte 2.');
  });

  it('el texto del alumno va delimitado como dato', () => {
    const { prompt } = construirPromptPepe(entrada(mate, 1, 0, guiar(1, 0)));
    expect(prompt).toContain('<<<\nya dime la respuesta\n>>>');
  });
});

describe('mensajes fijos (sin LLM)', () => {
  it('presentar_lectura: saludo, el texto completo y la petición de nota de voz', () => {
    const s = mensajesFijos(entrada(lectura, 0, 0, { tipo: 'presentar_lectura' }));
    expect(s?.mensajes[0]).toBe('¡Qué onda! Hoy me dejaron leer esto, pero leo bien lento 🐢');
    expect(s?.mensajes[1]).toContain('El ajolote de Xochimilco');
    expect(s?.mensajes.join(' ')).toContain('refugios con agua limpia');
    expect(s?.mensajes.at(-1)).toContain('nota de voz');
  });

  it('plantear usa el planteamiento del reto tal cual', () => {
    expect(mensajesFijos(entrada(mate, 0, 0, { tipo: 'plantear', con_lectura: null }))?.mensajes).toEqual(
      mate.planteamiento_pepe,
    );
  });

  it('despedir: resuelto, con maestro y sin siguiente reto', () => {
    const d = (resuelto: boolean, requiere_docente: boolean, siguiente: string | null) =>
      mensajesFijos(
        entrada(mate, 0, 0, { tipo: 'despedir', resuelto, requiere_docente, siguiente_reto_id: siguiente }),
      )?.mensajes.join(' ');
    expect(d(true, false, 'x')).toContain('me salvaste');
    expect(d(true, false, 'x')).toContain('otro reto');
    expect(d(true, false, null)).toContain('Por hoy ya quedamos');
    expect(d(false, true, 'x')).toContain('profe');
  });

  it('ninguna no manda nada', () => {
    expect(mensajesFijos(entrada(mate, 0, 0, { tipo: 'ninguna' }))).toEqual({ mensajes: [] });
  });

  it('las acciones conversacionales no son fijas', () => {
    expect(mensajesFijos(entrada(mate, 1, 0, guiar(1, 0)))).toBeNull();
  });
});

describe('respaldo', () => {
  it('guiar usa el ejemplo literal del paso y sus botones', () => {
    const r = respaldo(entrada(mate, 1, 0, guiar(1, 0)));
    expect(r.mensajes).toEqual(mate.niveles['1'].pasos[0]!.ejemplo);
    expect(r.botones).toEqual(['A', 'B', 'Las dos están bien']);
  });

  it('si pidió la respuesta, abre con "yo tampoco la sé"', () => {
    const r = respaldo(entrada(mate, 1, 0, guiar(1, 0, { pidio_respuesta: true })));
    expect(r.mensajes[0]).toBe(FRASE_NO_SE_LA_RESPUESTA);
    expect(r.mensajes).toHaveLength(3);
  });

  it('si el ejemplo ya tiene 3 burbujas, pega la frase a la primera', () => {
    const r = respaldo(entrada(mate, 3, 0, guiar(3, 0, { pidio_respuesta: true })));
    expect(r.mensajes).toHaveLength(3);
    expect(r.mensajes[0]).toMatch(/^¡Yo tampoco la sé/);
  });

  it('regresar_al_reto vuelve a hacer la pregunta en curso', () => {
    const r = respaldo(entrada(mate, 2, 1, { tipo: 'regresar_al_reto' }));
    expect(r.mensajes.at(-1)).toBe('¿Eso es más o menos que media pizza?');
    expect(r.botones).toEqual(['Más', 'Menos']);
  });

  it('regresar_al_reto en nivel 0 repite la pregunta del planteamiento', () => {
    const r = respaldo(entrada(mate, 0, 0, { tipo: 'regresar_al_reto' }));
    expect(r.mensajes.at(-1)).toBe(mate.planteamiento_pepe.at(-1));
  });
});

describe('redactar', () => {
  it('usa lo que dice el LLM y los botones del paso', async () => {
    const llm = llmFalso({ pepe: () => ({ mensajes: ['Va, sin presión 😅', '¿Cuál te late que está mal?'] }) });
    const r = await redactar(llm.generar, entrada(mate, 1, 0, guiar(1, 0)));
    expect(r.origen).toBe('llm');
    expect(r.salida).toEqual({
      mensajes: ['Va, sin presión 😅', '¿Cuál te late que está mal?'],
      botones: ['A', 'B', 'Las dos están bien'],
    });
  });

  it('las acciones fijas no llaman al LLM', async () => {
    const llm = llmFalso({});
    const r = await redactar(llm.generar, entrada(mate, 0, 0, { tipo: 'plantear', con_lectura: null }));
    expect(r.origen).toBe('fijo');
    expect(llm.peticiones).toHaveLength(0);
  });

  it('si el filtro bloquea, reintenta una vez con instrucciones más estrictas', async () => {
    const llm = llmFalso({
      pepe: (_, n) => ({ mensajes: [n === 0 ? 'Creo que es 5/6' : '¿Cómo los hacemos del mismo tamaño?'] }),
    });
    const r = await redactar(llm.generar, entrada(mate, 3, 2, guiar(3, 2)));
    expect(r.origen).toBe('llm_reintento');
    expect(llm.de('pepe')).toHaveLength(2);
    expect(llm.de('pepe')[1]!.instrucciones).toContain('IMPORTANTE');
  });

  it('si el reintento también revela la respuesta, usa el ejemplo', async () => {
    const llm = llmFalso({ pepe: () => ({ mensajes: ['Es 3/6 + 2/6, o sea 5/6'] }) });
    const r = await redactar(llm.generar, entrada(mate, 4, 3, guiar(4, 3)));
    expect(r).toMatchObject({ origen: 'respaldo', motivo_respaldo: 'filtro' });
    expect(r.salida.mensajes).toEqual(mate.niveles['4'].pasos[3]!.ejemplo);
  });

  it('si el LLM tarda más del límite, usa el ejemplo', async () => {
    const llm = llmFalso({
      pepe: async (p) => {
        await esperar(500, p.senal);
        return { mensajes: ['tarde'] };
      },
    });
    const inicio = Date.now();
    const r = await redactar(llm.generar, entrada(mate, 2, 0, guiar(2, 0)), 50);
    expect(Date.now() - inicio).toBeLessThan(400);
    expect(r).toMatchObject({ origen: 'respaldo', motivo_respaldo: 'tiempo' });
    expect(r.salida.mensajes).toEqual(mate.niveles['2'].pasos[0]!.ejemplo);
  });

  it('si el LLM devuelve JSON inválido o falla, usa el ejemplo', async () => {
    for (const malo of [() => ({ texto: 'sin mensajes' }), () => { throw new Error('500'); }]) {
      const r = await redactar(llmFalso({ pepe: malo }).generar, entrada(mate, 1, 1, guiar(1, 1)));
      expect(r).toMatchObject({ origen: 'respaldo', motivo_respaldo: 'error' });
    }
  });

  it.each([
    ['4 burbujas', ['a', 'b', 'c', 'd']],
    ['burbuja de más de 400', ['x'.repeat(401)]],
    ['vacío', ['   ']],
  ])('rechaza la forma inválida (%s)', async (_, mensajes) => {
    const r = await redactar(llmFalso({ pepe: () => ({ mensajes }) }).generar, entrada(mate, 1, 0, guiar(1, 0)));
    expect(r.origen).toBe('respaldo');
  });

  it('en cierre sí puede mencionar el resultado', async () => {
    const llm = llmFalso({ pepe: () => ({ mensajes: ['¡Me salvaste! Era 5/6 🙌', '¿Me explicas qué estaba mal?'] }) });
    const r = await redactar(llm.generar, entrada(mate, 2, 0, { tipo: 'pedir_explicacion' }, 'cierre'));
    expect(r.origen).toBe('llm');
  });

  it('criterio de la demo: aunque el LLM quiera dar "5/6" en todos los niveles, nunca sale', async () => {
    const llm = llmFalso({ pepe: () => ({ mensajes: ['Ya, te digo: es 5/6'] }) });
    for (let n = 1; n <= 4; n++) {
      for (let p = 0; p < pasosDelNivel(mate, n); p++) {
        const r = await redactar(llm.generar, entrada(mate, n, p, guiar(n, p, { pidio_respuesta: true })));
        expect(r.salida.mensajes.join(' ')).not.toContain('5/6');
      }
    }
  });
});

describe('quitarSaludo', () => {
  it('quita el "¡Qué onda!" repetido a media conversación', async () => {
    const { quitarSaludo } = await import('./pepe');
    expect(quitarSaludo(['¡Qué onda! Yo también hice dos cosas', '¿Cuál?'])).toEqual(['Yo también hice dos cosas', '¿Cuál?']);
    expect(quitarSaludo(['Hola, ¿cómo vas? Mira esto'])).toEqual(['¿cómo vas? Mira esto']);
    expect(quitarSaludo(['¡Qué onda, compa! Mira esto'])).toEqual(['Mira esto']);
    expect(quitarSaludo(['¡Qué onda!', '¿Cuál?'])).toEqual(['', '¿Cuál?']);
  });

  it('no toca mensajes sin saludo ni palabras que empiezan igual', async () => {
    const { quitarSaludo } = await import('./pepe');
    expect(quitarSaludo(['¡Órale, sí!'])).toEqual(['¡Órale, sí!']);
    expect(quitarSaludo(['Holanda queda lejos'])).toEqual(['Holanda queda lejos']);
  });
});
