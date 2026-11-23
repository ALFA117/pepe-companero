/**
 * Fábricas para los tests: evaluaciones del Juez, sesiones en un punto dado y
 * retos sintéticos. Solo se importa desde archivos *.test.ts.
 */
import { crearSesion, transicion, type ContextoMotor } from '@/motor/maquina';
import type {
  Clasificacion,
  EvaluacionFinalLLM,
  EvaluacionTurno,
  EventoMotor,
  ResultadoTransicion,
  Reto,
  Sesion,
} from '@/motor/tipos';

/** Evaluación del Juez con valores razonables; se sobreescribe lo que importe. */
export function ev(clasificacion: Clasificacion, extra: Partial<EvaluacionTurno> = {}): EvaluacionTurno {
  return {
    clasificacion,
    detecto_error: clasificacion === 'correcta' ? true : null,
    explica_por_que: clasificacion === 'correcta' ? 'si' : null,
    usa_evidencia_textual: null,
    conceptos_demostrados: [],
    brecha_probable: null,
    comentario_docente: 'prueba',
    confianza: 0.9,
    ...extra,
  };
}

/** Atajo para el evento de evaluación. */
export function juez(clasificacion: Clasificacion, extra: Partial<EvaluacionTurno> = {}): EventoMotor {
  return { tipo: 'evaluacion', evaluacion: ev(clasificacion, extra) };
}

export function evFinal(extra: Partial<EvaluacionFinalLLM> = {}): EvaluacionFinalLLM {
  return {
    resuelto: true,
    explicacion_final: {
      identifica_error: true,
      explica_por_que: true,
      usa_evidencia_textual: null,
      vocabulario: 'informal',
    },
    brechas_detectadas: [],
    estrategia_aprendida: null,
    comentario_docente: 'prueba',
    ...extra,
  };
}

export function final(extra: Partial<EvaluacionFinalLLM> = {}): EventoMotor {
  return { tipo: 'evaluacion_final', evaluacion: evFinal(extra) };
}

/** Sesión nueva (no pendiente) para el reto. */
export function nueva(reto: Reto): ResultadoTransicion {
  return crearSesion({ id: 'sesion-1', alumno_id: 'alumno-1', reto, canal: 'web' });
}

/** Sesión ya en la fase `nivel`, en el nivel y paso indicados. */
export function enNivel(reto: Reto, nivel: number, paso = 0, extra: Partial<Sesion> = {}): Sesion {
  return {
    ...nueva(reto).sesion,
    fase: 'nivel',
    nivel,
    paso,
    nivel_max: nivel,
    ...extra,
  };
}

/** Aplica una lista de eventos y devuelve cada resultado intermedio. */
export function recorrer(
  inicio: Sesion,
  eventos: EventoMotor[],
  ctx: ContextoMotor,
): ResultadoTransicion[] {
  const resultados: ResultadoTransicion[] = [];
  let s = inicio;
  for (const e of eventos) {
    const r = transicion(s, e, ctx);
    resultados.push(r);
    s = r.sesion;
  }
  return resultados;
}

export function ultimo<T>(xs: readonly T[]): T {
  const x = xs[xs.length - 1];
  if (x === undefined) throw new Error('lista vacía');
  return x;
}

/** Congela un objeto en profundidad para comprobar que no se muta. */
export function congelar<T>(o: T): T {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o)) congelar(v);
  }
  return o;
}

const pasoSintetico = { objetivo: 'o', ejemplo: ['e'] };
const nivelSintetico = { objetivo: 'o', pasos: [pasoSintetico, pasoSintetico] };

/** Reto mínimo válido para probar el validador y la elección del siguiente reto. */
export function retoSintetico(extra: Partial<Reto> & { id: string }): Reto {
  return {
    materia: 'matematicas',
    grado: '1_secundaria',
    concepto: 'concepto_a',
    dificultad: 1,
    prerequisito: null,
    planteamiento_pepe: ['hola'],
    error_plantado: 'e',
    solucion_para_juez: 's',
    prohibido_para_pepe: ['respuesta secreta'],
    rubrica: { correcta: 'c', parcial: 'p', incorrecta: 'i', evidencia_minima_cierre: 'e' },
    niveles: { '1': nivelSintetico, '2': nivelSintetico, '3': nivelSintetico, '4': nivelSintetico },
    ...extra,
  };
}
