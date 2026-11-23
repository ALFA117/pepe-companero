import { describe, expect, it } from 'vitest';
import { obtenerReto } from '@/retos/cargar';
import {
  congelar,
  enNivel,
  ev,
  final,
  juez,
  nueva,
  recorrer,
  retoSintetico,
  ultimo,
} from '@/test/fabricas';
import {
  TransicionInvalidaError,
  clasificacionEfectiva,
  crearSesion,
  esUltimoPaso,
  pasoActual,
  pasosDelNivel,
  transicion,
  type ContextoMotor,
} from './maquina';
import type { EventoMotor, Reto } from './tipos';

const mate = obtenerReto('mate-suma-fracciones-01');
const lectura = obtenerReto('lectura-inferencia-causal-ajolote-01');

/** Banco con prerrequisitos, para comprobar a dónde manda al terminar. */
const equivalentes = retoSintetico({ id: 'mate-equivalentes-01', concepto: 'fracciones_equivalentes' });
const sumaDificil = retoSintetico({
  id: 'mate-suma-fracciones-02',
  concepto: 'suma_fracciones_distinto_denominador',
  dificultad: 2,
});
const sumaIgual = retoSintetico({
  id: 'mate-suma-fracciones-03',
  concepto: 'suma_fracciones_distinto_denominador',
});
const banco: Reto[] = [mate, lectura, equivalentes, sumaDificil, sumaIgual];

const ctxMate: ContextoMotor = { reto: mate, banco };
const ctxLectura: ContextoMotor = { reto: lectura, banco };

/** Para las reglas que valen igual en los dos retos. */
const AMBOS = [
  { nombre: 'matemáticas', reto: mate, ctx: ctxMate },
  { nombre: 'lectura', reto: lectura, ctx: ctxLectura },
];

// ─────────────────────────────────────────────────────────────
// Consultas
// ─────────────────────────────────────────────────────────────

describe('consultas sobre el reto', () => {
  it('cuenta los pasos de cada nivel (el 0 tiene uno)', () => {
    expect([0, 1, 2, 3, 4].map((n) => pasosDelNivel(mate, n))).toEqual([1, 2, 3, 3, 4]);
    expect([0, 1, 2, 3, 4].map((n) => pasosDelNivel(lectura, n))).toEqual([1, 2, 2, 2, 3]);
  });

  it('rechaza niveles fuera de rango', () => {
    expect(() => pasosDelNivel(mate, 5)).toThrow(RangeError);
    expect(() => pasosDelNivel(mate, -1)).toThrow(RangeError);
  });

  it('pasoActual da el paso en curso y null en el nivel 0', () => {
    expect(pasoActual(mate, enNivel(mate, 2, 1))?.objetivo).toBe('¿2/5 es más o menos que media pizza?');
    expect(pasoActual(mate, enNivel(mate, 0))).toBeNull();
    expect(pasoActual(mate, { ...enNivel(mate, 2), fase: 'cierre' })).toBeNull();
  });

  it('esUltimoPaso', () => {
    expect(esUltimoPaso(mate, { nivel: 0, paso: 0 })).toBe(true);
    expect(esUltimoPaso(mate, { nivel: 4, paso: 2 })).toBe(false);
    expect(esUltimoPaso(mate, { nivel: 4, paso: 3 })).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────
// Crear e iniciar
// ─────────────────────────────────────────────────────────────

describe('crear sesión', () => {
  it('un reto de matemáticas arranca en nivel 0 con el planteamiento', () => {
    const r = nueva(mate);
    expect(r.sesion).toMatchObject({ fase: 'nivel', nivel: 0, paso: 0, nivel_max: 0, version: 0 });
    expect(r.accion).toEqual({ tipo: 'plantear', con_lectura: null });
  });

  it('un reto de lectura arranca esperando la nota de voz', () => {
    const r = nueva(lectura);
    expect(r.sesion.fase).toBe('leyendo_texto');
    expect(r.accion).toEqual({ tipo: 'presentar_lectura' });
  });

  it('una sesión pendiente no manda nada', () => {
    const r = crearSesion({ id: 's', alumno_id: 'a', reto: mate, canal: 'whatsapp', pendiente: true });
    expect(r.sesion.fase).toBe('pendiente');
    expect(r.accion).toEqual({ tipo: 'ninguna' });
  });

  it('iniciar una sesión pendiente la arranca según el tipo de reto', () => {
    for (const reto of [mate, lectura]) {
      const p = crearSesion({ id: 's', alumno_id: 'a', reto, canal: 'whatsapp', pendiente: true });
      const r = transicion(p.sesion, { tipo: 'iniciar' }, { reto, banco });
      expect(r.sesion.fase).toBe(reto === mate ? 'nivel' : 'leyendo_texto');
      expect(r.sesion.canal).toBe('whatsapp');
    }
  });
});

// ─────────────────────────────────────────────────────────────
// leyendo_texto
// ─────────────────────────────────────────────────────────────

describe('fase leyendo_texto', () => {
  const leyendo = nueva(lectura).sesion;

  it('con la nota de voz pasa al nivel 0 y plantea', () => {
    const r = transicion(leyendo, { tipo: 'lectura_audio' }, ctxLectura);
    expect(r.sesion).toMatchObject({ fase: 'nivel', nivel: 0, paso: 0 });
    expect(r.accion).toEqual({ tipo: 'plantear', con_lectura: true });
  });

  it('con texto, Pepe insiste una vez y se queda esperando', () => {
    const r = transicion(leyendo, { tipo: 'lectura_texto', no_puede_grabar: false }, ctxLectura);
    expect(r.sesion).toMatchObject({ fase: 'leyendo_texto', insistio_lectura: true });
    expect(r.accion).toEqual({ tipo: 'insistir_lectura' });
  });

  it('a la segunda vez con texto sigue sin métricas', () => {
    const [, r] = recorrer(
      leyendo,
      [
        { tipo: 'lectura_texto', no_puede_grabar: false },
        { tipo: 'lectura_texto', no_puede_grabar: false },
      ],
      ctxLectura,
    );
    expect(r?.sesion).toMatchObject({ fase: 'nivel', nivel: 0 });
    expect(r?.accion).toEqual({ tipo: 'plantear', con_lectura: false });
  });

  it('si dice que no puede grabar, sigue sin insistir', () => {
    const r = transicion(leyendo, { tipo: 'lectura_texto', no_puede_grabar: true }, ctxLectura);
    expect(r.sesion).toMatchObject({ fase: 'nivel', insistio_lectura: false });
    expect(r.accion).toEqual({ tipo: 'plantear', con_lectura: false });
  });

  it('después de insistir, el audio todavía cuenta', () => {
    const r = recorrer(
      leyendo,
      [{ tipo: 'lectura_texto', no_puede_grabar: false }, { tipo: 'lectura_audio' }],
      ctxLectura,
    );
    expect(ultimo(r).accion).toEqual({ tipo: 'plantear', con_lectura: true });
  });

  it('no acepta evaluaciones antes de leer', () => {
    expect(() => transicion(leyendo, juez('correcta'), ctxLectura)).toThrow(TransicionInvalidaError);
  });
});

// ─────────────────────────────────────────────────────────────
// correcta
// ─────────────────────────────────────────────────────────────

describe.each(AMBOS)('correcta ($nombre)', ({ reto, ctx }) => {
  it('en nivel 0 con justificación pasa a cierre', () => {
    const r = transicion(enNivel(reto, 0), juez('correcta', { explica_por_que: 'si' }), ctx);
    expect(r.sesion.fase).toBe('cierre');
    expect(r.accion).toEqual({ tipo: 'pedir_explicacion' });
    expect(r.sesion.nivel_max).toBe(0);
  });

  it('una justificación parcial también cuenta', () => {
    const r = transicion(enNivel(reto, 0), juez('correcta', { explica_por_que: 'parcial' }), ctx);
    expect(r.sesion.fase).toBe('cierre');
  });

  it('en nivel 0 sin justificación pregunta "¿y cómo sabes?"', () => {
    for (const explica of ['no', null] as const) {
      const r = transicion(enNivel(reto, 0), juez('correcta', { explica_por_que: explica }), ctx);
      expect(r.sesion).toMatchObject({ fase: 'nivel', nivel: 0, pidio_justificacion: true });
      expect(r.accion).toEqual({ tipo: 'pedir_justificacion' });
    }
  });

  it('si después justifica, pasa a cierre', () => {
    const r = recorrer(
      enNivel(reto, 0),
      [juez('correcta', { explica_por_que: 'no' }), juez('correcta', { explica_por_que: 'si' })],
      ctx,
    );
    expect(ultimo(r).sesion.fase).toBe('cierre');
    expect(ultimo(r).sesion.nivel_max).toBe(0);
  });

  it('si a la segunda tampoco justifica, cuenta como parcial y salta al nivel 3', () => {
    const r = recorrer(
      enNivel(reto, 0),
      [juez('correcta', { explica_por_que: 'no' }), juez('correcta', { explica_por_que: 'no' })],
      ctx,
    );
    expect(ultimo(r).clasificacion_efectiva).toBe('parcial');
    expect(ultimo(r).sesion).toMatchObject({ fase: 'nivel', nivel: 3, paso: 0, nivel_max: 3 });
    expect(ultimo(r).accion).toMatchObject({ tipo: 'guiar', atajo: true, motivo: 'parcial' });
  });

  it('si el Juez dice que no detectó el error, la segunda sin justificar sube solo un nivel', () => {
    const r = recorrer(
      enNivel(reto, 0),
      [
        juez('correcta', { explica_por_que: 'no' }),
        juez('correcta', { explica_por_que: 'no', detecto_error: false }),
      ],
      ctx,
    );
    expect(ultimo(r).sesion.nivel).toBe(1);
  });

  it('en cualquier otro nivel y paso, correcta pasa directo a cierre (sin pedir justificación)', () => {
    for (let nivel = 1; nivel <= 4; nivel++) {
      for (let paso = 0; paso < pasosDelNivel(reto, nivel); paso++) {
        const r = transicion(enNivel(reto, nivel, paso), juez('correcta', { explica_por_que: 'no' }), ctx);
        expect(r.sesion.fase).toBe('cierre');
        expect(r.sesion.nivel_max).toBe(nivel);
        expect(r.accion).toEqual({ tipo: 'pedir_explicacion' });
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────
// paso_correcto
// ─────────────────────────────────────────────────────────────

describe.each(AMBOS)('paso_correcto ($nombre)', ({ reto, ctx }) => {
  it('avanza un paso dentro del mismo nivel', () => {
    const r = transicion(enNivel(reto, 2, 0), juez('paso_correcto'), ctx);
    expect(r.sesion).toMatchObject({ nivel: 2, paso: 1 });
    expect(r.accion).toMatchObject({ tipo: 'guiar', nivel: 2, paso: 1, cambio_de_nivel: false });
  });

  it('en el último paso cuenta como parcial y sube de nivel', () => {
    const ultimoPaso = pasosDelNivel(reto, 2) - 1;
    const r = transicion(enNivel(reto, 2, ultimoPaso), juez('paso_correcto'), ctx);
    expect(r.clasificacion_efectiva).toBe('parcial');
    expect(r.sesion).toMatchObject({ nivel: 3, paso: 0 });
  });

  it('en el último paso del nivel 1, si detectó el error, toma el atajo al 3', () => {
    const r = transicion(enNivel(reto, 1, 1), juez('paso_correcto', { detecto_error: true }), ctx);
    expect(r.sesion.nivel).toBe(3);
    expect(r.accion).toMatchObject({ atajo: true });
  });

  it('en nivel 0 no hay pasos: cuenta como parcial', () => {
    const r = transicion(enNivel(reto, 0), juez('paso_correcto'), ctx);
    expect(r.clasificacion_efectiva).toBe('parcial');
    expect(r.sesion.nivel).toBe(1);
  });

  it('en el último paso del nivel 4 termina y avisa al maestro', () => {
    const r = transicion(enNivel(reto, 4, pasosDelNivel(reto, 4) - 1), juez('paso_correcto'), ctx);
    expect(r.sesion).toMatchObject({ fase: 'terminado', requiere_docente: true });
  });
});

// ─────────────────────────────────────────────────────────────
// parcial / incorrecta / no_se
// ─────────────────────────────────────────────────────────────

describe.each(AMBOS)('fallos ($nombre)', ({ reto, ctx }) => {
  it.each(['parcial', 'incorrecta', 'no_se'] as const)('%s sube un nivel y reinicia el paso', (c) => {
    for (let nivel = 0; nivel <= 3; nivel++) {
      for (let paso = 0; paso < pasosDelNivel(reto, nivel); paso++) {
        const r = transicion(enNivel(reto, nivel, paso), juez(c, { detecto_error: false }), ctx);
        expect(r.sesion).toMatchObject({ fase: 'nivel', nivel: nivel + 1, paso: 0, nivel_max: nivel + 1 });
        expect(r.accion).toMatchObject({
          tipo: 'guiar',
          nivel: nivel + 1,
          paso: 0,
          cambio_de_nivel: true,
          motivo: c,
          pidio_respuesta: false,
          atajo: false,
        });
      }
    }
  });

  it('atajo: parcial que detectó el error en nivel 0 o 1 salta al 3', () => {
    for (const nivel of [0, 1]) {
      const r = transicion(enNivel(reto, nivel), juez('parcial', { detecto_error: true }), ctx);
      expect(r.sesion).toMatchObject({ nivel: 3, paso: 0, nivel_max: 3 });
      expect(r.accion).toMatchObject({ atajo: true, cambio_de_nivel: true });
    }
  });

  it('sin atajo desde el nivel 2 en adelante', () => {
    const r2 = transicion(enNivel(reto, 2), juez('parcial', { detecto_error: true }), ctx);
    expect(r2.sesion.nivel).toBe(3);
    expect(r2.accion).toMatchObject({ atajo: false });
    const r3 = transicion(enNivel(reto, 3), juez('parcial', { detecto_error: true }), ctx);
    expect(r3.sesion.nivel).toBe(4);
  });

  it('el atajo es solo para parcial: incorrecta o no_se con detecto_error no saltan', () => {
    for (const c of ['incorrecta', 'no_se'] as const) {
      const r = transicion(enNivel(reto, 0), juez(c, { detecto_error: true }), ctx);
      expect(r.sesion.nivel).toBe(1);
    }
  });

  it('detecto_error null no activa el atajo', () => {
    const r = transicion(enNivel(reto, 0), juez('parcial', { detecto_error: null }), ctx);
    expect(r.sesion.nivel).toBe(1);
  });

  it('en el nivel 4, fallar un paso que no es el último avanza al siguiente paso', () => {
    const r = transicion(enNivel(reto, 4, 0), juez('no_se'), ctx);
    expect(r.sesion).toMatchObject({ fase: 'nivel', nivel: 4, paso: 1 });
    expect(r.accion).toMatchObject({ tipo: 'guiar', nivel: 4, paso: 1, cambio_de_nivel: false });
  });

  it('en el último paso del nivel 4, fallar termina, marca requiere_docente y asigna el prerrequisito', () => {
    const r = transicion(enNivel(reto, 4, pasosDelNivel(reto, 4) - 1), juez('incorrecta'), ctx);
    expect(r.sesion).toMatchObject({ fase: 'terminado', requiere_docente: true, nivel_max: 4 });
    expect(r.accion).toMatchObject({ tipo: 'despedir', resuelto: false, requiere_docente: true });
  });

  it('nivel_max nunca baja', () => {
    const r = transicion(enNivel(reto, 1, 0, { nivel_max: 3 }), juez('no_se'), ctx);
    expect(r.sesion).toMatchObject({ nivel: 2, nivel_max: 3 });
  });
});

// ─────────────────────────────────────────────────────────────
// pide_respuesta
// ─────────────────────────────────────────────────────────────

describe.each(AMBOS)('pide_respuesta ($nombre)', ({ reto, ctx }) => {
  it('sube un nivel como no_se, cuenta la petición y marca la acción', () => {
    for (let nivel = 0; nivel <= 3; nivel++) {
      const r = transicion(enNivel(reto, nivel), juez('pide_respuesta'), ctx);
      expect(r.sesion).toMatchObject({ nivel: nivel + 1, contador_pide_respuesta: 1 });
      expect(r.accion).toMatchObject({ tipo: 'guiar', pidio_respuesta: true, motivo: 'pide_respuesta' });
    }
  });

  it('nunca toma el atajo, aunque el Juez marque detecto_error', () => {
    const r = transicion(enNivel(reto, 0), juez('pide_respuesta', { detecto_error: true }), ctx);
    expect(r.sesion.nivel).toBe(1);
  });

  it('el contador se acumula en toda la sesión, también en el nivel 4', () => {
    const veces = 4 + pasosDelNivel(reto, 4);
    const r = recorrer(enNivel(reto, 0), Array.from({ length: veces }, () => juez('pide_respuesta')), ctx);
    expect(ultimo(r).sesion).toMatchObject({
      fase: 'terminado',
      requiere_docente: true,
      contador_pide_respuesta: veces,
    });
  });

  it('nada de lo que devuelve la máquina contiene la solución ni frases prohibidas', () => {
    const veces = 4 + pasosDelNivel(reto, 4);
    const r = recorrer(enNivel(reto, 0), Array.from({ length: veces }, () => juez('pide_respuesta')), ctx);
    const todo = JSON.stringify(r);
    expect(todo).not.toContain(reto.solucion_para_juez);
    for (const p of reto.prohibido_para_pepe) expect(todo).not.toContain(p);
  });
});

// ─────────────────────────────────────────────────────────────
// fuera_de_tema
// ─────────────────────────────────────────────────────────────

describe.each(AMBOS)('fuera_de_tema ($nombre)', ({ reto, ctx }) => {
  it('no cambia nada en ningún nivel ni paso; Pepe regresa al reto', () => {
    for (let nivel = 0; nivel <= 4; nivel++) {
      for (let paso = 0; paso < pasosDelNivel(reto, nivel); paso++) {
        const s = enNivel(reto, nivel, paso, { contador_pide_respuesta: 2, pidio_justificacion: true });
        const r = transicion(s, juez('fuera_de_tema'), ctx);
        expect(r.sesion).toEqual(s);
        expect(r.accion).toEqual({ tipo: 'regresar_al_reto' });
      }
    }
  });

  it('muchos mensajes fuera de tema seguidos tampoco cambian nada', () => {
    const s = enNivel(reto, 2, 1);
    const r = recorrer(s, Array.from({ length: 10 }, () => juez('fuera_de_tema')), ctx);
    expect(ultimo(r).sesion).toEqual(s);
  });
});

// ─────────────────────────────────────────────────────────────
// Confianza baja
// ─────────────────────────────────────────────────────────────

describe('confianza menor a 0.5', () => {
  it('cualquier clasificación se trata como parcial sin atajo', () => {
    for (const c of ['correcta', 'incorrecta', 'no_se', 'paso_correcto', 'fuera_de_tema'] as const) {
      const r = transicion(enNivel(mate, 0), juez(c, { confianza: 0.3, detecto_error: true }), ctxMate);
      expect(r.clasificacion_efectiva).toBe('parcial');
      expect(r.sesion.nivel).toBe(1);
      expect(r.accion).toMatchObject({ atajo: false });
    }
  });

  it('justo 0.5 ya cuenta como confiable', () => {
    expect(clasificacionEfectiva(ev('correcta', { confianza: 0.5 })).clasificacion).toBe('correcta');
    expect(clasificacionEfectiva(ev('correcta', { confianza: 0.49 }))).toEqual({
      clasificacion: 'parcial',
      detecto_error: false,
      baja_confianza: true,
    });
  });
});

// ─────────────────────────────────────────────────────────────
// cierre
// ─────────────────────────────────────────────────────────────

describe('fase cierre', () => {
  const enCierre = (nivel_max: number) => ({ ...enNivel(mate, nivel_max), fase: 'cierre' as const });

  it('la evaluación final termina la sesión y el motor pone el nivel de ayuda', () => {
    const r = transicion(enCierre(2), final({ resuelto: true }), ctxMate);
    expect(r.sesion.fase).toBe('terminado');
    expect(r.evaluacion_final?.nivel_ayuda_maximo).toBe(2);
    expect(r.accion).toMatchObject({ tipo: 'despedir', resuelto: true, requiere_docente: false });
  });

  it('respeta lo que dice el Juez aunque no haya resuelto la explicación', () => {
    const r = transicion(enCierre(1), final({ resuelto: false }), ctxMate);
    expect(r.sesion.fase).toBe('terminado');
    expect(r.accion).toMatchObject({ resuelto: false });
  });

  it('sin ayuda (nivel_max 0): siguiente reto más difícil del mismo concepto', () => {
    const r = transicion(enCierre(0), final(), ctxMate);
    expect(r.sesion.siguiente_reto_id).toBe('mate-suma-fracciones-02');
  });

  it('con ayuda (1 a 3): mismo concepto, misma dificultad', () => {
    for (const n of [1, 2, 3]) {
      expect(transicion(enCierre(n), final(), ctxMate).sesion.siguiente_reto_id).toBe('mate-suma-fracciones-03');
    }
  });

  it('llegó al nivel 4: siguiente reto del prerrequisito', () => {
    expect(transicion(enCierre(4), final(), ctxMate).sesion.siguiente_reto_id).toBe('mate-equivalentes-01');
  });

  it('no repite retos que el alumno ya hizo', () => {
    const r = transicion(enCierre(0), final(), { ...ctxMate, ya_hechos: ['mate-suma-fracciones-02'] });
    expect(r.sesion.siguiente_reto_id).toBe('mate-suma-fracciones-03');
  });

  it('sin candidatos en el banco, el siguiente reto es null', () => {
    const r = transicion(enCierre(2), final(), { reto: mate, banco: [mate] });
    expect(r.sesion.siguiente_reto_id).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────
// terminado y eventos inválidos
// ─────────────────────────────────────────────────────────────

describe('sesión terminada y eventos que no aplican', () => {
  const terminada = { ...enNivel(mate, 2), fase: 'terminado' as const };

  it('una sesión terminada ignora todo', () => {
    const eventos: EventoMotor[] = [juez('correcta'), final(), { tipo: 'iniciar' }, { tipo: 'lectura_audio' }];
    for (const e of eventos) {
      const r = transicion(terminada, e, ctxMate);
      expect(r.sesion).toBe(terminada);
      expect(r.accion).toEqual({ tipo: 'sesion_terminada' });
    }
  });

  it.each([
    ['iniciar en nivel', enNivel(mate, 0), { tipo: 'iniciar' }],
    ['audio de lectura en nivel', enNivel(mate, 0), { tipo: 'lectura_audio' }],
    ['texto de lectura en nivel', enNivel(mate, 0), { tipo: 'lectura_texto', no_puede_grabar: false }],
    ['evaluación final en nivel', enNivel(mate, 0), final()],
    ['evaluación en cierre', { ...enNivel(mate, 0), fase: 'cierre' }, juez('correcta')],
    ['evaluación en pendiente', { ...enNivel(mate, 0), fase: 'pendiente' }, juez('correcta')],
  ] as const)('lanza TransicionInvalidaError: %s', (_, sesion, evento) => {
    expect(() => transicion(sesion, evento as EventoMotor, ctxMate)).toThrow(TransicionInvalidaError);
  });

  it('rechaza un contexto de otro reto', () => {
    expect(() => transicion(enNivel(mate, 0), juez('correcta'), ctxLectura)).toThrow(/reto/);
  });
});

// ─────────────────────────────────────────────────────────────
// Pureza
// ─────────────────────────────────────────────────────────────

describe('pureza', () => {
  it('no muta la sesión, el evento ni el reto', () => {
    const s = congelar(enNivel(mate, 1));
    const e = congelar(juez('no_se'));
    const ctx = congelar({ reto: structuredClone(mate), banco: structuredClone(banco) });
    expect(() => transicion(s, e, ctx)).not.toThrow();
    expect(s.nivel).toBe(1);
  });

  it('misma entrada, misma salida', () => {
    const s = enNivel(mate, 1);
    expect(transicion(s, juez('parcial'), ctxMate)).toEqual(transicion(s, juez('parcial'), ctxMate));
  });

  it('no toca la versión (eso es de la capa de datos)', () => {
    const r = transicion(enNivel(mate, 1, 0, { version: 7 }), juez('no_se'), ctxMate);
    expect(r.sesion.version).toBe(7);
  });
});

// ─────────────────────────────────────────────────────────────
// Recorridos completos (sección 5 del brief)
// ─────────────────────────────────────────────────────────────

describe('recorridos completos: reto 1 (matemáticas)', () => {
  it('no sabe nada: llega del 0 al 4 y, al no poder, termina con el maestro', () => {
    const r = recorrer(
      nueva(mate).sesion,
      [
        juez('incorrecta'), // 0 → 1   acepta 2/5
        juez('no_se'), // 1 → 2
        juez('paso_correcto'), // 2.0 → 2.1
        juez('incorrecta'), // 2.1 → 3
        juez('no_se'), // 3 → 4
        juez('paso_correcto'), // 4.0 → 4.1
        juez('paso_correcto'), // 4.1 → 4.2
        juez('paso_correcto'), // 4.2 → 4.3
        juez('incorrecta'), // 4.3 (último) → terminado
      ],
      ctxMate,
    );
    expect(r.map((x) => [x.sesion.nivel, x.sesion.paso])).toEqual([
      [1, 0], [2, 0], [2, 1], [3, 0], [4, 0], [4, 1], [4, 2], [4, 3], [4, 3],
    ]);
    expect(ultimo(r).sesion).toMatchObject({ fase: 'terminado', requiere_docente: true, nivel_max: 4 });
    expect(ultimo(r).sesion.siguiente_reto_id).toBe('mate-equivalentes-01');
  });

  it('no sabe nada: llega al 4 y ahí lo resuelve (criterio de la demo)', () => {
    const r = recorrer(
      nueva(mate).sesion,
      [
        juez('no_se'),
        juez('no_se'),
        juez('no_se'),
        juez('no_se'),
        juez('paso_correcto'),
        juez('paso_correcto'),
        juez('paso_correcto'),
        juez('correcta'), // "5/6": lo dice el ALUMNO
        final({ resuelto: true }),
      ],
      ctxMate,
    );
    expect(r[3]?.sesion.nivel).toBe(4);
    expect(r[7]?.sesion.fase).toBe('cierre');
    expect(ultimo(r).sesion).toMatchObject({ fase: 'terminado', requiere_docente: false });
    expect(ultimo(r).evaluacion_final?.nivel_ayuda_maximo).toBe(4);
    expect(ultimo(r).sesion.siguiente_reto_id).toBe('mate-equivalentes-01');
  });

  it('se salta del 1 al 3', () => {
    const r = recorrer(
      nueva(mate).sesion,
      [
        juez('incorrecta'), // 0 → 1
        juez('paso_correcto'), // elige B
        juez('parcial', { detecto_error: true }), // "los de abajo no se suman… no sé por qué" → 3
        juez('paso_correcto'),
        juez('paso_correcto'),
        juez('correcta'),
        final(),
      ],
      ctxMate,
    );
    expect(r[2]?.sesion).toMatchObject({ nivel: 3, paso: 0 });
    expect(r[2]?.accion).toMatchObject({ atajo: true });
    expect(ultimo(r).evaluacion_final?.nivel_ayuda_maximo).toBe(3);
  });

  it('pide la respuesta varias veces y aun así nunca se le da', () => {
    const r = recorrer(
      nueva(mate).sesion,
      [
        juez('pide_respuesta'),
        juez('pide_respuesta'),
        juez('fuera_de_tema'), // "hazme mi tarea de historia"
        juez('pide_respuesta'),
        juez('correcta'),
        final(),
      ],
      ctxMate,
    );
    expect(r[2]?.accion).toEqual({ tipo: 'regresar_al_reto' });
    expect(r[3]?.sesion).toMatchObject({ nivel: 3, contador_pide_respuesta: 3 });
    expect(ultimo(r).sesion.contador_pide_respuesta).toBe(3);
    expect(ultimo(r).sesion.fase).toBe('terminado');
  });

  it('resuelve en nivel 0 con justificación', () => {
    const r = recorrer(nueva(mate).sesion, [juez('correcta'), final()], ctxMate);
    expect(ultimo(r).evaluacion_final?.nivel_ayuda_maximo).toBe(0);
    expect(ultimo(r).sesion.siguiente_reto_id).toBe('mate-suma-fracciones-02');
  });

  it('resuelve en nivel 0 sin justificación y luego justifica', () => {
    const r = recorrer(
      nueva(mate).sesion,
      [juez('correcta', { explica_por_que: 'no' }), juez('correcta'), final()],
      ctxMate,
    );
    expect(r.map((x) => x.accion.tipo)).toEqual(['pedir_justificacion', 'pedir_explicacion', 'despedir']);
    expect(ultimo(r).evaluacion_final?.nivel_ayuda_maximo).toBe(0);
  });
});

describe('recorridos completos: reto 2 (lectura)', () => {
  it('lee en voz, no sabe nada y llega al 4; termina con el maestro', () => {
    const r = recorrer(
      nueva(lectura).sesion,
      [
        { tipo: 'lectura_audio' },
        juez('incorrecta'), // acepta la pesca
        juez('no_se'),
        juez('incorrecta'),
        juez('no_se'),
        juez('paso_correcto'),
        juez('paso_correcto'),
        juez('incorrecta'),
      ],
      ctxLectura,
    );
    expect(ultimo(r).sesion).toMatchObject({ fase: 'terminado', requiere_docente: true, nivel_max: 4 });
    // El prerrequisito (localizar_informacion_literal) no está en este banco: no hay siguiente.
    expect(ultimo(r).sesion.siguiente_reto_id).toBeNull();
  });

  it('manda texto dos veces en vez de audio y resuelve con evidencia en el nivel 2', () => {
    const r = recorrer(
      nueva(lectura).sesion,
      [
        { tipo: 'lectura_texto', no_puede_grabar: false },
        { tipo: 'lectura_texto', no_puede_grabar: false },
        juez('incorrecta'),
        juez('incorrecta'),
        juez('paso_correcto'), // "No dice nada de pesca"
        juez('correcta', { usa_evidencia_textual: true }),
        final(),
      ],
      ctxLectura,
    );
    expect(r.map((x) => x.accion.tipo)).toEqual([
      'insistir_lectura',
      'plantear',
      'guiar',
      'guiar',
      'guiar',
      'pedir_explicacion',
      'despedir',
    ]);
    expect(ultimo(r).evaluacion_final?.nivel_ayuda_maximo).toBe(2);
  });

  it('detecta que no habla de pesca pero no da las causas: salta del 0 al 3', () => {
    const r = recorrer(
      nueva(lectura).sesion,
      [{ tipo: 'lectura_audio' }, juez('parcial', { detecto_error: true }), juez('paso_correcto'), juez('correcta')],
      ctxLectura,
    );
    expect(r[1]?.sesion.nivel).toBe(3);
    expect(ultimo(r).sesion.fase).toBe('cierre');
  });

  it('resuelve en nivel 0 sin justificar dos veces: cae al nivel 3', () => {
    const r = recorrer(
      nueva(lectura).sesion,
      [
        { tipo: 'lectura_audio' },
        juez('correcta', { explica_por_que: 'no' }),
        juez('correcta', { explica_por_que: 'no' }),
      ],
      ctxLectura,
    );
    expect(ultimo(r).sesion).toMatchObject({ nivel: 3, pidio_justificacion: true });
  });

  it('pide la respuesta y habla de otra cosa sin cambiar el progreso', () => {
    const r = recorrer(
      nueva(lectura).sesion,
      [{ tipo: 'lectura_audio' }, juez('pide_respuesta'), juez('fuera_de_tema'), juez('fuera_de_tema')],
      ctxLectura,
    );
    expect(ultimo(r).sesion).toMatchObject({ nivel: 1, paso: 0, contador_pide_respuesta: 1 });
  });
});
