/**
 * Máquina de estados de Pepe (sección 5 del brief).
 *
 * Es una función PURA: recibe la sesión, un evento y el contexto (el reto y el
 * banco), y devuelve una sesión NUEVA más la acción que Pepe tiene que
 * redactar. No toca la base de datos, no llama al LLM y no conoce la solución.
 * El LLM nunca decide el nivel: solo clasifica (Juez) y redacta (Pepe).
 *
 * `version` (bloqueo optimista) la maneja la capa de datos, no la máquina.
 */
import { elegirSiguienteReto } from './siguiente';
import {
  CONFIANZA_MINIMA,
  type AccionPepe,
  type Clasificacion,
  type EvaluacionFinalLLM,
  type EvaluacionTurno,
  type EventoMotor,
  type NivelAyuda,
  type NombreCanal,
  type Paso,
  type ResultadoTransicion,
  type Reto,
  type Sesion,
} from './tipos';

export const NIVEL_MAXIMO = 4;
/** Desde estos niveles, un `parcial` que detectó el error salta directo al 3. */
const NIVEL_MAXIMO_PARA_ATAJO = 1;
const NIVEL_DEL_ATAJO = 3;

export interface ContextoMotor {
  reto: Reto;
  /** Banco completo, para elegir el siguiente reto al terminar. */
  banco: readonly Reto[];
  /** Retos que el alumno ya hizo, para no repetirlos. */
  ya_hechos?: readonly string[];
}

export class TransicionInvalidaError extends Error {
  constructor(
    readonly fase: Sesion['fase'],
    readonly evento: EventoMotor['tipo'],
  ) {
    super(`El evento "${evento}" no aplica en la fase "${fase}"`);
    this.name = 'TransicionInvalidaError';
  }
}

// ─────────────────────────────────────────────────────────────
// Consultas sobre el reto
// ─────────────────────────────────────────────────────────────

/** Cuántos pasos tiene un nivel. El nivel 0 es el planteamiento: un solo "paso". */
export function pasosDelNivel(reto: Reto, nivel: number): number {
  if (nivel === 0) return 1;
  return reto.niveles[claveNivel(nivel)].pasos.length;
}

/** El paso en curso, o null en el nivel 0 y fuera de la fase `nivel`. */
export function pasoActual(reto: Reto, sesion: Sesion): Paso | null {
  if (sesion.fase !== 'nivel' || sesion.nivel === 0) return null;
  return reto.niveles[claveNivel(sesion.nivel)].pasos[sesion.paso] ?? null;
}

export function esUltimoPaso(reto: Reto, sesion: Pick<Sesion, 'nivel' | 'paso'>): boolean {
  return sesion.paso >= pasosDelNivel(reto, sesion.nivel) - 1;
}

function claveNivel(nivel: number): NivelAyuda {
  if (nivel < 1 || nivel > NIVEL_MAXIMO || !Number.isInteger(nivel)) {
    throw new RangeError(`Nivel de ayuda fuera de rango: ${nivel}`);
  }
  return String(nivel) as NivelAyuda;
}

/**
 * Aplica la regla de confianza: si el Juez duda (confianza < 0.5), se trata
 * como `parcial` sin atajo, para no castigar al alumno por un error del Juez.
 */
export function clasificacionEfectiva(ev: EvaluacionTurno): {
  clasificacion: Clasificacion;
  detecto_error: boolean | null;
  baja_confianza: boolean;
} {
  if (ev.confianza < CONFIANZA_MINIMA) {
    return { clasificacion: 'parcial', detecto_error: false, baja_confianza: true };
  }
  return { clasificacion: ev.clasificacion, detecto_error: ev.detecto_error, baja_confianza: false };
}

// ─────────────────────────────────────────────────────────────
// Crear una sesión
// ─────────────────────────────────────────────────────────────

export interface NuevaSesion {
  id: string;
  alumno_id: string;
  reto: Reto;
  canal: NombreCanal;
  /** true cuando la asigna el maestro y todavía no se le puede escribir al alumno. */
  pendiente?: boolean;
}

export function crearSesion(p: NuevaSesion): ResultadoTransicion {
  const base: Sesion = {
    id: p.id,
    alumno_id: p.alumno_id,
    reto_id: p.reto.id,
    canal: p.canal,
    fase: 'pendiente',
    nivel: 0,
    paso: 0,
    nivel_max: 0,
    pidio_justificacion: false,
    insistio_lectura: false,
    contador_pide_respuesta: 0,
    requiere_docente: false,
    siguiente_reto_id: null,
    version: 0,
  };
  if (p.pendiente) return { sesion: base, accion: { tipo: 'ninguna' } };
  return arrancar(base, p.reto);
}

function arrancar(s: Sesion, reto: Reto): ResultadoTransicion {
  if (reto.requiere_lectura_voz) {
    return { sesion: { ...s, fase: 'leyendo_texto' }, accion: { tipo: 'presentar_lectura' } };
  }
  return {
    sesion: { ...s, fase: 'nivel', nivel: 0, paso: 0 },
    accion: { tipo: 'plantear', con_lectura: null },
  };
}

// ─────────────────────────────────────────────────────────────
// Transición
// ─────────────────────────────────────────────────────────────

export function transicion(
  sesion: Sesion,
  evento: EventoMotor,
  ctx: ContextoMotor,
): ResultadoTransicion {
  if (sesion.reto_id !== ctx.reto.id) {
    throw new Error(`La sesión es del reto "${sesion.reto_id}" pero llegó "${ctx.reto.id}"`);
  }

  // Una sesión terminada ya no cambia: `procesar` decide si arranca otra.
  if (sesion.fase === 'terminado') {
    return { sesion, accion: { tipo: 'sesion_terminada' } };
  }

  switch (evento.tipo) {
    case 'iniciar':
      if (sesion.fase !== 'pendiente') throw new TransicionInvalidaError(sesion.fase, evento.tipo);
      return arrancar(sesion, ctx.reto);

    case 'lectura_audio':
      if (sesion.fase !== 'leyendo_texto') throw new TransicionInvalidaError(sesion.fase, evento.tipo);
      return {
        sesion: { ...sesion, fase: 'nivel', nivel: 0, paso: 0 },
        accion: { tipo: 'plantear', con_lectura: true },
      };

    case 'lectura_texto':
      if (sesion.fase !== 'leyendo_texto') throw new TransicionInvalidaError(sesion.fase, evento.tipo);
      // Pepe insiste una sola vez; a la segunda (o si no puede grabar) seguimos sin métricas.
      if (!sesion.insistio_lectura && !evento.no_puede_grabar) {
        return {
          sesion: { ...sesion, insistio_lectura: true },
          accion: { tipo: 'insistir_lectura' },
        };
      }
      return {
        sesion: { ...sesion, fase: 'nivel', nivel: 0, paso: 0 },
        accion: { tipo: 'plantear', con_lectura: false },
      };

    case 'evaluacion':
      if (sesion.fase !== 'nivel') throw new TransicionInvalidaError(sesion.fase, evento.tipo);
      return evaluarTurno(sesion, evento.evaluacion, ctx);

    case 'evaluacion_final':
      if (sesion.fase !== 'cierre') throw new TransicionInvalidaError(sesion.fase, evento.tipo);
      return cerrar(sesion, evento.evaluacion, ctx);
  }
}

// ─────────────────────────────────────────────────────────────
// Fase `nivel`
// ─────────────────────────────────────────────────────────────

function evaluarTurno(s: Sesion, ev: EvaluacionTurno, ctx: ContextoMotor): ResultadoTransicion {
  const efectiva = clasificacionEfectiva(ev);
  const { clasificacion } = efectiva;

  switch (clasificacion) {
    case 'fuera_de_tema':
      // No cambia nada: Pepe regresa al reto en una frase.
      return { sesion: s, accion: { tipo: 'regresar_al_reto' }, clasificacion_efectiva: clasificacion };

    case 'correcta':
      return correcta(s, ev, efectiva.detecto_error, ctx);

    case 'paso_correcto':
      if (!esUltimoPaso(ctx.reto, s)) {
        const sig = { ...s, paso: s.paso + 1 };
        return {
          sesion: sig,
          accion: guiar(sig, { motivo: 'paso_correcto', cambio_de_nivel: false }),
          clasificacion_efectiva: 'paso_correcto',
        };
      }
      // Sin más pasos, responder la pregunta guía no basta: cuenta como parcial.
      return fallo(s, 'parcial', efectiva.detecto_error, ctx);

    case 'parcial':
    case 'incorrecta':
    case 'no_se':
    case 'pide_respuesta':
      return fallo(s, clasificacion, efectiva.detecto_error, ctx);
  }
}

function correcta(
  s: Sesion,
  ev: EvaluacionTurno,
  detectoError: boolean | null,
  ctx: ContextoMotor,
): ResultadoTransicion {
  const explico = ev.explica_por_que === 'si' || ev.explica_por_que === 'parcial';

  if (s.nivel === 0 && !explico) {
    if (!s.pidio_justificacion) {
      // Contra respuestas copiadas de otra IA: "¿y cómo sabes?"
      return {
        sesion: { ...s, pidio_justificacion: true },
        accion: { tipo: 'pedir_justificacion' },
        clasificacion_efectiva: 'correcta',
      };
    }
    // Segunda vez sin justificar: cuenta como parcial. Dio el resultado,
    // así que sí detectó el error (puede activar el atajo al nivel 3).
    return fallo(s, 'parcial', detectoError ?? true, ctx);
  }

  return {
    sesion: { ...s, fase: 'cierre' },
    accion: { tipo: 'pedir_explicacion' },
    clasificacion_efectiva: 'correcta',
  };
}

/** `parcial`, `incorrecta`, `no_se` y `pide_respuesta`: un nivel más de ayuda. */
function fallo(
  s: Sesion,
  motivo: Extract<Clasificacion, 'parcial' | 'incorrecta' | 'no_se' | 'pide_respuesta'>,
  detectoError: boolean | null,
  ctx: ContextoMotor,
): ResultadoTransicion {
  const pidioRespuesta = motivo === 'pide_respuesta';
  const contador = s.contador_pide_respuesta + (pidioRespuesta ? 1 : 0);

  if (s.nivel === NIVEL_MAXIMO) {
    if (!esUltimoPaso(ctx.reto, s)) {
      // Ya no hay más niveles: seguimos con el siguiente paso del nivel 4.
      const sig = { ...s, paso: s.paso + 1, contador_pide_respuesta: contador };
      return {
        sesion: sig,
        accion: guiar(sig, { motivo, cambio_de_nivel: false, pidio_respuesta: pidioRespuesta }),
        clasificacion_efectiva: motivo,
      };
    }
    // Falló el último paso del último nivel: lo atiende el maestro.
    const siguiente = elegirSiguienteReto(
      ctx.reto,
      { nivel_max: NIVEL_MAXIMO, requiere_docente: true },
      ctx.banco,
      ctx.ya_hechos,
    );
    return {
      sesion: {
        ...s,
        fase: 'terminado',
        requiere_docente: true,
        contador_pide_respuesta: contador,
        siguiente_reto_id: siguiente,
      },
      accion: { tipo: 'despedir', resuelto: false, requiere_docente: true, siguiente_reto_id: siguiente },
      clasificacion_efectiva: motivo,
    };
  }

  const atajo =
    motivo === 'parcial' && detectoError === true && s.nivel <= NIVEL_MAXIMO_PARA_ATAJO;
  const nivel = atajo ? NIVEL_DEL_ATAJO : s.nivel + 1;
  const sig: Sesion = {
    ...s,
    nivel,
    paso: 0,
    nivel_max: Math.max(s.nivel_max, nivel),
    contador_pide_respuesta: contador,
  };
  return {
    sesion: sig,
    accion: guiar(sig, { motivo, cambio_de_nivel: true, pidio_respuesta: pidioRespuesta, atajo }),
    clasificacion_efectiva: motivo,
  };
}

function guiar(
  s: Sesion,
  o: { motivo: Clasificacion; cambio_de_nivel: boolean; pidio_respuesta?: boolean; atajo?: boolean },
): AccionPepe {
  return {
    tipo: 'guiar',
    nivel: s.nivel,
    paso: s.paso,
    cambio_de_nivel: o.cambio_de_nivel,
    motivo: o.motivo,
    pidio_respuesta: o.pidio_respuesta ?? false,
    atajo: o.atajo ?? false,
  };
}

// ─────────────────────────────────────────────────────────────
// Fase `cierre`
// ─────────────────────────────────────────────────────────────

function cerrar(s: Sesion, ev: EvaluacionFinalLLM, ctx: ContextoMotor): ResultadoTransicion {
  const siguiente = elegirSiguienteReto(
    ctx.reto,
    { nivel_max: s.nivel_max, requiere_docente: s.requiere_docente },
    ctx.banco,
    ctx.ya_hechos,
  );
  return {
    sesion: { ...s, fase: 'terminado', siguiente_reto_id: siguiente },
    accion: {
      tipo: 'despedir',
      resuelto: ev.resuelto,
      requiere_docente: s.requiere_docente,
      siguiente_reto_id: siguiente,
    },
    // El nivel de ayuda lo pone el motor, no el LLM.
    evaluacion_final: { ...ev, nivel_ayuda_maximo: s.nivel_max },
  };
}
