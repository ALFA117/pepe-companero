/**
 * Puerto de datos del motor. Hay dos implementaciones:
 *   - `supabase.ts`: la real.
 *   - `memoria.ts`: para tests, el simulador y desarrollo local sin Supabase.
 */
import type {
  Clasificacion,
  EvaluacionFinal,
  EvaluacionTurno,
  NombreCanal,
  Sesion,
  Turno,
} from '@/motor/tipos';

export interface Grupo {
  id: string;
  nombre: string;
  escuela: string | null;
  docente_nombre: string | null;
  es_demo: boolean;
}

export interface Alumno {
  id: string;
  grupo_id: string;
  nombre: string;
  codigo: string;
  tel_hash: string | null;
  tel_cifrado: string | null;
  ultimo_mensaje_wa_en: string | null;
}

export type TipoTurno = 'texto' | 'audio' | 'boton';

export interface NuevoTurno {
  sesion_id: string;
  rol: Turno['rol'];
  tipo: TipoTurno;
  texto: string;
  mensaje_externo_id?: string | null;
}

export interface TurnoGuardado extends Turno {
  id: string;
  sesion_id: string;
  tipo: TipoTurno;
  mensaje_externo_id?: string | null;
  creado_en: string;
}

export interface MetricasFluidez {
  palabras_texto: number;
  palabras_correctas_est: number | null;
  duracion_voz_s: number;
  ppm: number;
  pausas_largas: number;
  precision_est: number | null;
}

export interface SesionGuardada extends Sesion {
  creado_en: string;
  actualizado_en: string;
}

export interface Repositorio {
  // Alumnos
  alumnoPorCodigo(codigo: string): Promise<Alumno | null>;
  alumnoPorId(id: string): Promise<Alumno | null>;
  alumnoPorTelHash(telHash: string): Promise<Alumno | null>;
  vincularTelefono(alumnoId: string, telHash: string, telCifrado: string): Promise<void>;
  marcarMensajeWhatsApp(alumnoId: string, cuando: Date): Promise<void>;

  // Sesiones
  /** La sesión no terminada más reciente (incluye `pendiente`). */
  sesionActiva(alumnoId: string): Promise<SesionGuardada | null>;
  ultimaSesion(alumnoId: string): Promise<SesionGuardada | null>;
  sesionPorId(id: string): Promise<SesionGuardada | null>;
  insertarSesion(s: Sesion): Promise<SesionGuardada>;
  /**
   * Guarda `nueva` solo si la versión en la base sigue siendo `anterior.version`
   * (bloqueo optimista). Devuelve la sesión con la versión incrementada, o null
   * si otro proceso la cambió primero.
   */
  actualizarSesion(anterior: Sesion, nueva: Sesion): Promise<SesionGuardada | null>;
  retosHechos(alumnoId: string): Promise<string[]>;

  // Turnos
  existeMensajeExterno(id: string): Promise<boolean>;
  /** Devuelve el id, o null si `mensaje_externo_id` ya existía (duplicado). */
  agregarTurno(t: NuevoTurno): Promise<string | null>;
  ultimosTurnos(sesionId: string, n: number): Promise<TurnoGuardado[]>;

  // Evaluaciones
  guardarEvaluacion(e: {
    turno_id: string;
    sesion_id: string;
    clasificacion: Clasificacion;
    nivel: number;
    paso: number;
    juez: EvaluacionTurno & { clasificacion_juez: Clasificacion };
  }): Promise<void>;
  guardarEvaluacionFinal(sesionId: string, e: EvaluacionFinal): Promise<void>;
  guardarFluidez(sesionId: string, m: MetricasFluidez): Promise<void>;
}

export type { NombreCanal };
