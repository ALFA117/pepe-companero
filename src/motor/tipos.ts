/**
 * Contrato del motor de Pepe.
 *
 * Todo lo que cruza entre módulos (retos, sesión, Juez, Pepe) se define aquí
 * con zod, para validar en tiempo de ejecución y sacar los tipos de TypeScript.
 * Los nombres van en snake_case para que coincidan con la base de datos y con
 * la salida JSON de los LLM.
 */
import { z } from 'zod';

// ─────────────────────────────────────────────────────────────
// Retos (src/retos/banco/*.json)
// ─────────────────────────────────────────────────────────────

/** Límites de los botones de respuesta de WhatsApp. */
export const MAX_BOTONES = 3;
export const MAX_LARGO_BOTON = 20;

const Botones = z.array(z.string().min(1).max(MAX_LARGO_BOTON)).max(MAX_BOTONES);

export const PasoSchema = z.object({
  objetivo: z.string().min(1),
  /** Mensajes de referencia. También son el respaldo si el LLM falla o tarda. */
  ejemplo: z.array(z.string().min(1)).min(1),
  botones: Botones.optional(),
});

export const NivelSchema = z.object({
  objetivo: z.string().min(1),
  /** El último paso siempre vuelve a plantear la pregunta del reto. */
  pasos: z.array(PasoSchema).min(1),
});

export const NIVELES_AYUDA = ['1', '2', '3', '4'] as const;

export const RetoSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    materia: z.enum(['matematicas', 'lectura']),
    grado: z.string().min(1),
    concepto: z.string().min(1),
    dificultad: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    prerequisito: z.string().nullable(),
    texto: z
      .object({
        titulo: z.string().min(1),
        parrafos: z.array(z.string().min(1)).min(1),
      })
      .optional(),
    requiere_lectura_voz: z.boolean().optional(),
    planteamiento_pepe: z.array(z.string().min(1)).min(1),
    error_plantado: z.string().min(1),
    /** NUNCA se le pasa a Pepe. */
    solucion_para_juez: z.string().min(1),
    prohibido_para_pepe: z.array(z.string().min(1)).min(1),
    rubrica: z.object({
      correcta: z.string().min(1),
      parcial: z.string().min(1),
      incorrecta: z.string().min(1),
      evidencia_minima_cierre: z.string().min(1),
    }),
    niveles: z.object({
      '1': NivelSchema,
      '2': NivelSchema,
      '3': NivelSchema,
      '4': NivelSchema,
    }),
  })
  .refine((r) => r.materia !== 'lectura' || r.texto !== undefined, {
    message: 'Los retos de lectura necesitan `texto`.',
    path: ['texto'],
  });

export type Paso = z.infer<typeof PasoSchema>;
export type Nivel = z.infer<typeof NivelSchema>;
export type Reto = z.infer<typeof RetoSchema>;
export type NivelAyuda = (typeof NIVELES_AYUDA)[number];

// ─────────────────────────────────────────────────────────────
// Sesión (tabla `sesiones`)
// ─────────────────────────────────────────────────────────────

export const FASES = ['pendiente', 'leyendo_texto', 'nivel', 'cierre', 'terminado'] as const;
export type Fase = (typeof FASES)[number];

export const CANALES = ['web', 'whatsapp'] as const;
export type NombreCanal = (typeof CANALES)[number];

export interface Sesion {
  id: string;
  alumno_id: string;
  reto_id: string;
  canal: NombreCanal;
  fase: Fase;
  /** 0 = planteamiento; 1 a 4 = escalera de ayuda. */
  nivel: number;
  /** Índice del paso dentro del nivel. */
  paso: number;
  nivel_max: number;
  pidio_justificacion: boolean;
  insistio_lectura: boolean;
  contador_pide_respuesta: number;
  requiere_docente: boolean;
  siguiente_reto_id: string | null;
  /** Bloqueo optimista: cada transición incrementa la versión. */
  version: number;
}

// ─────────────────────────────────────────────────────────────
// Lo que manda el alumno
// ─────────────────────────────────────────────────────────────

export type EntradaAlumno =
  | { tipo: 'texto'; texto: string }
  | { tipo: 'boton'; texto: string }
  | {
      tipo: 'audio';
      /** El audio vive solo en memoria y se descarta después de transcribir. */
      audio: ArrayBuffer;
      mime: string;
    };

export interface Turno {
  rol: 'alumno' | 'pepe';
  texto: string;
}

// ─────────────────────────────────────────────────────────────
// Juez
// ─────────────────────────────────────────────────────────────

export const CLASIFICACIONES = [
  'correcta',
  'paso_correcto',
  'parcial',
  'incorrecta',
  'no_se',
  'pide_respuesta',
  'fuera_de_tema',
] as const;
export type Clasificacion = (typeof CLASIFICACIONES)[number];

/** Debajo de esta confianza, el motor trata la respuesta como `parcial`. */
export const CONFIANZA_MINIMA = 0.5;

export const EvaluacionTurnoSchema = z.object({
  clasificacion: z.enum(CLASIFICACIONES),
  detecto_error: z.boolean().nullable(),
  explica_por_que: z.enum(['si', 'parcial', 'no']).nullable(),
  /** Solo para lectura. */
  usa_evidencia_textual: z.boolean().nullable(),
  conceptos_demostrados: z.array(z.string()),
  /** P. ej. "fracciones_equivalentes", "vocabulario: contaminación". */
  brecha_probable: z.string().nullable(),
  /** Una línea para el panel del maestro. */
  comentario_docente: z.string().max(160),
  confianza: z.number().min(0).max(1),
});
export type EvaluacionTurno = z.infer<typeof EvaluacionTurnoSchema>;

/** Lo que devuelve el LLM en `cierre`. */
export const EvaluacionFinalLLMSchema = z.object({
  resuelto: z.boolean(),
  explicacion_final: z.object({
    identifica_error: z.boolean(),
    explica_por_que: z.boolean(),
    usa_evidencia_textual: z.boolean().nullable(),
    vocabulario: z.enum(['informal', 'adecuado', 'tecnico']),
  }),
  brechas_detectadas: z.array(z.string()),
  estrategia_aprendida: z.string().nullable(),
  comentario_docente: z.string().max(200),
});

/** Lo que se guarda: el motor agrega `nivel_ayuda_maximo` (no lo decide el LLM). */
export const EvaluacionFinalSchema = EvaluacionFinalLLMSchema.extend({
  nivel_ayuda_maximo: z.number().int().min(0).max(4),
});
export type EvaluacionFinalLLM = z.infer<typeof EvaluacionFinalLLMSchema>;
export type EvaluacionFinal = z.infer<typeof EvaluacionFinalSchema>;

// ─────────────────────────────────────────────────────────────
// Máquina de estados: eventos que entran y acciones que salen
// ─────────────────────────────────────────────────────────────

/**
 * Lo que le pasa a la sesión. `procesar.ts` traduce la entrada del alumno
 * (texto, botón, audio) al evento que toca según la fase.
 */
export type EventoMotor =
  /** El maestro asignó un reto pendiente y ya se puede arrancar. */
  | { tipo: 'iniciar' }
  /** En `leyendo_texto`: llegó la nota de voz (ya transcrita y medida). */
  | { tipo: 'lectura_audio' }
  /** En `leyendo_texto`: llegó texto en vez de audio. */
  | { tipo: 'lectura_texto'; no_puede_grabar: boolean }
  /** En `nivel`: el Juez evaluó la respuesta del alumno. */
  | { tipo: 'evaluacion'; evaluacion: EvaluacionTurno }
  /** En `cierre`: el Juez evaluó la explicación final. */
  | { tipo: 'evaluacion_final'; evaluacion: EvaluacionFinalLLM };

/**
 * Qué tiene que hacer Pepe después de la transición. La máquina NUNCA redacta
 * texto ni conoce la solución: solo dice el tipo de mensaje y en qué nivel/paso.
 */
export type AccionPepe =
  /** Sesión creada como pendiente: no se manda nada todavía. */
  | { tipo: 'ninguna' }
  /** "Hoy me dejaron leer esto…" + el texto + "¿Me lo lees en una nota de voz?" */
  | { tipo: 'presentar_lectura' }
  /** El alumno mandó texto en vez de audio: Pepe insiste con amabilidad (una vez). */
  | { tipo: 'insistir_lectura' }
  /** Mensajes de `planteamiento_pepe`. `con_lectura` es null si el reto no es de lectura. */
  | { tipo: 'plantear'; con_lectura: boolean | null }
  /** Contestó bien en nivel 0 sin explicar: "¿y cómo sabes?" */
  | { tipo: 'pedir_justificacion' }
  /** Mensaje del paso actual de la escalera de ayuda. */
  | {
      tipo: 'guiar';
      nivel: number;
      paso: number;
      /** true si se acaba de subir de nivel (Pepe abre con una transición). */
      cambio_de_nivel: boolean;
      /** La clasificación que provocó este mensaje. */
      motivo: Clasificacion;
      /** "¡Yo tampoco la sé, por eso te pregunto!" */
      pidio_respuesta: boolean;
      /** Saltó directo al nivel 3 porque ya había detectado el error. */
      atajo: boolean;
    }
  /** Habló de otra cosa: Pepe regresa al reto en una frase. */
  | { tipo: 'regresar_al_reto' }
  /** Resolvió: "¡me salvaste!" y pide la explicación con sus palabras. */
  | { tipo: 'pedir_explicacion' }
  /** Fin del reto. */
  | {
      tipo: 'despedir';
      resuelto: boolean;
      requiere_docente: boolean;
      siguiente_reto_id: string | null;
    }
  /** Llegó algo a una sesión ya terminada. */
  | { tipo: 'sesion_terminada' };

export interface ResultadoTransicion {
  sesion: Sesion;
  accion: AccionPepe;
  /** Clasificación con la que decidió la máquina (puede diferir de la del Juez). */
  clasificacion_efectiva?: Clasificacion;
  /** Solo al salir de `cierre`: la evaluación final con `nivel_ayuda_maximo` del motor. */
  evaluacion_final?: EvaluacionFinal;
}

// ─────────────────────────────────────────────────────────────
// Pepe
// ─────────────────────────────────────────────────────────────

export const SalidaPepeSchema = z.object({
  mensajes: z.array(z.string().min(1).max(400)).min(1).max(3),
  botones: Botones.optional(),
});
export type SalidaPepe = z.infer<typeof SalidaPepeSchema>;
