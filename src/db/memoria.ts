/**
 * Repositorio en memoria. Imita las reglas de la base (ids únicos,
 * idempotencia por `mensaje_externo_id`, bloqueo optimista por `version`)
 * para que los tests y el simulador se comporten como producción.
 */
import type { EvaluacionFinal, Sesion } from '@/motor/tipos';
import {
  CodigoOcupadoError,
  SesionActivaDuplicadaError,
  type Alumno,
  type DatosPanel,
  type EvaluacionFinalGuardada,
  type FluidezGuardada,
  type Grupo,
  type MetricasFluidez,
  type NuevoTurno,
  type Repositorio,
  type SesionGuardada,
  type TurnoGuardado,
} from './repositorio';

export interface DatosMemoria {
  grupos: Grupo[];
  alumnos: Alumno[];
  sesiones: SesionGuardada[];
  turnos: TurnoGuardado[];
  evaluaciones: { id: string; turno_id: string; sesion_id: string; clasificacion: string; nivel: number; paso: number; juez: unknown; creado_en: string }[];
  evaluaciones_finales: (EvaluacionFinal & { sesion_id: string; creado_en: string })[];
  fluidez: (MetricasFluidez & { sesion_id: string; creado_en: string })[];
}

export const GRUPO_PRUEBAS_ID = '00000000-0000-0000-0000-000000000001';

/** Los mismos datos que `supabase/seed.sql`. */
export function datosIniciales(): DatosMemoria {
  return {
    grupos: [
      {
        id: GRUPO_PRUEBAS_ID,
        nombre: '1° B (pruebas)',
        escuela: 'Secundaria de prueba',
        docente_nombre: 'Profe de prueba',
        es_demo: false,
      },
    ],
    alumnos: [1, 2, 3].map((n) => ({
      id: `00000000-0000-0000-0000-00000000010${n}`,
      grupo_id: GRUPO_PRUEBAS_ID,
      nombre: `Alumno Prueba ${n}`,
      codigo: `PEPE-1B-0${n}`,
      tel_hash: null,
      tel_cifrado: null,
      ultimo_mensaje_wa_en: null,
    })),
    sesiones: [],
    turnos: [],
    evaluaciones: [],
    evaluaciones_finales: [],
    fluidez: [],
  };
}

export class RepositorioMemoria implements Repositorio {
  private reloj = 0;

  constructor(readonly datos: DatosMemoria = datosIniciales()) {}

  /** Fechas que siempre avanzan, para que el orden sea estable en tests. */
  private ahora(): string {
    this.reloj = Math.max(this.reloj + 1, Date.now());
    return new Date(this.reloj).toISOString();
  }

  async crearAlumno(grupo: Grupo, nuevo: { nombre: string; codigo: string }) {
    if (!this.datos.grupos.some((g) => g.id === grupo.id)) this.datos.grupos.push({ ...grupo });
    const codigo = nuevo.codigo.trim().toUpperCase();
    if (this.datos.alumnos.some((a) => a.codigo === codigo)) throw new CodigoOcupadoError(codigo);
    const alumno: Alumno = {
      id: crypto.randomUUID(),
      grupo_id: grupo.id,
      nombre: nuevo.nombre,
      codigo,
      tel_hash: null,
      tel_cifrado: null,
      ultimo_mensaje_wa_en: null,
    };
    this.datos.alumnos.push(alumno);
    return structuredClone(alumno);
  }

  async alumnoPorCodigo(codigo: string) {
    return this.datos.alumnos.find((a) => a.codigo === codigo.trim().toUpperCase()) ?? null;
  }

  async alumnoPorId(id: string) {
    return this.datos.alumnos.find((a) => a.id === id) ?? null;
  }

  async alumnoPorTelHash(telHash: string) {
    return this.datos.alumnos.find((a) => a.tel_hash === telHash) ?? null;
  }

  async vincularTelefono(alumnoId: string, telHash: string, telCifrado: string) {
    if (this.datos.alumnos.some((a) => a.tel_hash === telHash && a.id !== alumnoId)) {
      throw new Error('Ese teléfono ya está vinculado a otro alumno');
    }
    const a = this.datos.alumnos.find((x) => x.id === alumnoId);
    if (!a) throw new Error('Alumno no encontrado');
    a.tel_hash = telHash;
    a.tel_cifrado = telCifrado;
  }

  async marcarMensajeWhatsApp(alumnoId: string, cuando: Date) {
    const a = this.datos.alumnos.find((x) => x.id === alumnoId);
    if (a) a.ultimo_mensaje_wa_en = cuando.toISOString();
  }

  private sesionesDe(alumnoId: string) {
    return this.datos.sesiones
      .filter((s) => s.alumno_id === alumnoId)
      .sort((a, b) => b.creado_en.localeCompare(a.creado_en));
  }

  async sesionActiva(alumnoId: string) {
    return structuredClone(this.sesionesDe(alumnoId).find((s) => s.fase !== 'terminado') ?? null);
  }

  async ultimaSesion(alumnoId: string) {
    return structuredClone(this.sesionesDe(alumnoId)[0] ?? null);
  }

  async sesionPorId(id: string) {
    return structuredClone(this.datos.sesiones.find((s) => s.id === id) ?? null);
  }

  async insertarSesion(s: Sesion) {
    if (this.datos.sesiones.some((x) => x.id === s.id)) throw new Error('Sesión duplicada');
    // Igual que el índice único parcial de la base: una sola sesión activa por alumno.
    if (s.fase !== 'terminado' && this.datos.sesiones.some((x) => x.alumno_id === s.alumno_id && x.fase !== 'terminado')) {
      throw new SesionActivaDuplicadaError(s.alumno_id);
    }
    const t = this.ahora();
    const guardada: SesionGuardada = { ...s, creado_en: t, actualizado_en: t };
    this.datos.sesiones.push(guardada);
    return structuredClone(guardada);
  }

  async actualizarSesion(anterior: Sesion, nueva: Sesion) {
    const i = this.datos.sesiones.findIndex((s) => s.id === anterior.id);
    const actual = this.datos.sesiones[i];
    if (!actual || actual.version !== anterior.version) return null;
    const guardada: SesionGuardada = {
      ...nueva,
      version: anterior.version + 1,
      creado_en: actual.creado_en,
      actualizado_en: this.ahora(),
    };
    this.datos.sesiones[i] = guardada;
    return structuredClone(guardada);
  }

  async retosHechos(alumnoId: string) {
    return [...new Set(this.datos.sesiones.filter((s) => s.alumno_id === alumnoId).map((s) => s.reto_id))];
  }

  async existeMensajeExterno(id: string) {
    return this.datos.turnos.some((t) => t.mensaje_externo_id === id);
  }

  async agregarTurno(t: NuevoTurno) {
    if (t.mensaje_externo_id && (await this.existeMensajeExterno(t.mensaje_externo_id))) return null;
    const id = crypto.randomUUID();
    this.datos.turnos.push({
      id,
      sesion_id: t.sesion_id,
      rol: t.rol,
      tipo: t.tipo,
      texto: t.texto,
      creado_en: this.ahora(),
      ...(t.mensaje_externo_id ? { mensaje_externo_id: t.mensaje_externo_id } : {}),
    } as TurnoGuardado);
    return id;
  }

  async ultimosTurnos(sesionId: string, n: number) {
    return structuredClone(this.datos.turnos.filter((t) => t.sesion_id === sesionId).slice(-n));
  }

  async guardarEvaluacion(e: Parameters<Repositorio['guardarEvaluacion']>[0]) {
    this.datos.evaluaciones.push({ id: crypto.randomUUID(), ...e, creado_en: this.ahora() });
  }

  async guardarEvaluacionFinal(sesionId: string, e: EvaluacionFinal) {
    this.datos.evaluaciones_finales = this.datos.evaluaciones_finales.filter((x) => x.sesion_id !== sesionId);
    this.datos.evaluaciones_finales.push({ ...e, sesion_id: sesionId, creado_en: this.ahora() });
  }

  async guardarFluidez(sesionId: string, m: MetricasFluidez) {
    this.datos.fluidez = this.datos.fluidez.filter((x) => x.sesion_id !== sesionId);
    this.datos.fluidez.push({ ...m, sesion_id: sesionId, creado_en: this.ahora() });
  }

  async grupos() {
    return structuredClone(this.datos.grupos);
  }

  async datosPanel(grupoId: string): Promise<DatosPanel | null> {
    const grupo = this.datos.grupos.find((g) => g.id === grupoId);
    if (!grupo) return null;
    const alumnos = this.datos.alumnos.filter((a) => a.grupo_id === grupoId);
    const ids = new Set(alumnos.map((a) => a.id));
    const sesiones = this.datos.sesiones.filter((s) => ids.has(s.alumno_id));
    const sids = new Set(sesiones.map((s) => s.id));
    return structuredClone({
      grupo,
      alumnos,
      sesiones,
      finales: this.datos.evaluaciones_finales.filter((f) => sids.has(f.sesion_id)) as EvaluacionFinalGuardada[],
      fluidez: this.datos.fluidez.filter((f) => sids.has(f.sesion_id)) as FluidezGuardada[],
      brechas_turno: this.datos.evaluaciones
        .filter((e) => sids.has(e.sesion_id))
        .map((e) => ({ sesion_id: e.sesion_id, brecha: (e.juez as { brecha_probable?: string | null }).brecha_probable ?? '' }))
        .filter((b) => b.brecha),
    });
  }

  async sesionesDeAlumno(alumnoId: string) {
    return structuredClone(this.sesionesDe(alumnoId));
  }

  async evaluacionFinal(sesionId: string) {
    return structuredClone(
      (this.datos.evaluaciones_finales.find((f) => f.sesion_id === sesionId) as EvaluacionFinalGuardada | undefined) ?? null,
    );
  }

  async fluidezDe(sesionId: string) {
    return structuredClone((this.datos.fluidez.find((f) => f.sesion_id === sesionId) as FluidezGuardada | undefined) ?? null);
  }
}

declare global {
  var __pepeRepoMemoria: RepositorioMemoria | undefined;
}

/** Agrega un grupo de demo (de `generarDemo`) a los datos en memoria. */
export function sembrarDemo(datos: DatosMemoria, demo: Omit<DatosMemoria, 'grupos'> & { grupo: Grupo }): void {
  datos.grupos.push(demo.grupo);
  datos.alumnos.push(...demo.alumnos);
  datos.sesiones.push(...demo.sesiones);
  datos.turnos.push(...demo.turnos);
  datos.evaluaciones.push(...demo.evaluaciones);
  datos.evaluaciones_finales.push(...demo.evaluaciones_finales);
  datos.fluidez.push(...demo.fluidez);
}

/**
 * Instancia compartida (sobrevive a los recargos de `next dev`). Recibe una
 * función opcional para sembrar datos la primera vez (p. ej. el grupo de demo).
 */
export function repositorioMemoriaGlobal(sembrar?: (datos: DatosMemoria) => void): RepositorioMemoria {
  if (!globalThis.__pepeRepoMemoria) {
    const datos = datosIniciales();
    sembrar?.(datos);
    globalThis.__pepeRepoMemoria = new RepositorioMemoria(datos);
  }
  return globalThis.__pepeRepoMemoria;
}
