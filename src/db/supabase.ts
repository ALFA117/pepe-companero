/**
 * Repositorio sobre Supabase (Postgres). Mismo contrato que `memoria.ts`.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
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

const VIOLACION_UNIQUE = '23505';
/** PostgREST devuelve como máximo 1000 filas por petición: se pide por páginas. */
const TAMANO_PAGINA = 1000;

type Pagina = PromiseLike<{ data: unknown[] | null; error: { message: string; code?: string } | null }>;

async function todasLasFilas(donde: string, pedir: (desde: number, hasta: number) => Pagina): Promise<unknown[]> {
  const filas: unknown[] = [];
  for (let desde = 0; ; desde += TAMANO_PAGINA) {
    const { data, error } = await pedir(desde, desde + TAMANO_PAGINA - 1);
    if (error) falla(donde, error);
    filas.push(...(data ?? []));
    if (!data || data.length < TAMANO_PAGINA) return filas;
  }
}

function falla(donde: string, error: { message: string; code?: string }): never {
  throw new Error(`[supabase] ${donde}: ${error.message}${error.code ? ` (${error.code})` : ''}`);
}

/** Columnas de `sesiones` que se escriben (sin fechas, que pone la base). */
function columnasSesion(s: Sesion) {
  return {
    id: s.id,
    alumno_id: s.alumno_id,
    reto_id: s.reto_id,
    canal: s.canal,
    fase: s.fase,
    nivel: s.nivel,
    paso: s.paso,
    nivel_max: s.nivel_max,
    pidio_justificacion: s.pidio_justificacion,
    insistio_lectura: s.insistio_lectura,
    contador_pide_respuesta: s.contador_pide_respuesta,
    requiere_docente: s.requiere_docente,
    siguiente_reto_id: s.siguiente_reto_id,
    version: s.version,
  };
}

export class RepositorioSupabase implements Repositorio {
  constructor(private readonly sb: SupabaseClient) {}

  async crearAlumno(grupo: Grupo, nuevo: { nombre: string; codigo: string }) {
    const { error: eg } = await this.sb.from('grupos').upsert(grupo, { onConflict: 'id', ignoreDuplicates: true });
    if (eg) falla('crearAlumno (grupo)', eg);
    const codigo = nuevo.codigo.trim().toUpperCase();
    const { data, error } = await this.sb
      .from('alumnos')
      .insert({ grupo_id: grupo.id, nombre: nuevo.nombre, codigo })
      .select('*')
      .single();
    if (error?.code === VIOLACION_UNIQUE) throw new CodigoOcupadoError(codigo);
    if (error) falla('crearAlumno', error);
    return data as Alumno;
  }

  async alumnoPorCodigo(codigo: string) {
    const { data, error } = await this.sb
      .from('alumnos')
      .select('*')
      .eq('codigo', codigo.trim().toUpperCase())
      .maybeSingle();
    if (error) falla('alumnoPorCodigo', error);
    return data as Alumno | null;
  }

  async alumnoPorId(id: string) {
    const { data, error } = await this.sb.from('alumnos').select('*').eq('id', id).maybeSingle();
    if (error) falla('alumnoPorId', error);
    return data as Alumno | null;
  }

  async alumnoPorTelHash(telHash: string) {
    const { data, error } = await this.sb.from('alumnos').select('*').eq('tel_hash', telHash).maybeSingle();
    if (error) falla('alumnoPorTelHash', error);
    return data as Alumno | null;
  }

  async vincularTelefono(alumnoId: string, telHash: string, telCifrado: string) {
    const { error } = await this.sb
      .from('alumnos')
      .update({ tel_hash: telHash, tel_cifrado: telCifrado })
      .eq('id', alumnoId);
    if (error) falla('vincularTelefono', error);
  }

  async marcarMensajeWhatsApp(alumnoId: string, cuando: Date) {
    const { error } = await this.sb
      .from('alumnos')
      .update({ ultimo_mensaje_wa_en: cuando.toISOString() })
      .eq('id', alumnoId);
    if (error) falla('marcarMensajeWhatsApp', error);
  }

  async sesionActiva(alumnoId: string) {
    const { data, error } = await this.sb
      .from('sesiones')
      .select('*')
      .eq('alumno_id', alumnoId)
      .neq('fase', 'terminado')
      .order('creado_en', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) falla('sesionActiva', error);
    return data as SesionGuardada | null;
  }

  async ultimaSesionTerminada(alumnoId: string) {
    const { data, error } = await this.sb
      .from('sesiones')
      .select('*')
      .eq('alumno_id', alumnoId)
      .eq('fase', 'terminado')
      .order('actualizado_en', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) falla('ultimaSesionTerminada', error);
    return data as SesionGuardada | null;
  }

  async ultimaSesion(alumnoId: string) {
    const { data, error } = await this.sb
      .from('sesiones')
      .select('*')
      .eq('alumno_id', alumnoId)
      .order('creado_en', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) falla('ultimaSesion', error);
    return data as SesionGuardada | null;
  }

  async sesionPorId(id: string) {
    const { data, error } = await this.sb.from('sesiones').select('*').eq('id', id).maybeSingle();
    if (error) falla('sesionPorId', error);
    return data as SesionGuardada | null;
  }

  async insertarSesion(s: Sesion) {
    const { data, error } = await this.sb.from('sesiones').insert(columnasSesion(s)).select('*').single();
    if (error?.code === VIOLACION_UNIQUE && error.message.includes('sesiones_una_activa_idx')) {
      throw new SesionActivaDuplicadaError(s.alumno_id);
    }
    if (error) falla('insertarSesion', error);
    return data as SesionGuardada;
  }

  async actualizarSesion(anterior: Sesion, nueva: Sesion) {
    // id y alumno_id nunca cambian.
    const cambios: Partial<ReturnType<typeof columnasSesion>> = columnasSesion(nueva);
    delete cambios.id;
    delete cambios.alumno_id;
    const { data, error } = await this.sb
      .from('sesiones')
      .update({ ...cambios, version: anterior.version + 1 })
      .eq('id', anterior.id)
      .eq('version', anterior.version)
      .select('*')
      .maybeSingle();
    if (error) falla('actualizarSesion', error);
    return data as SesionGuardada | null;
  }

  async retosHechos(alumnoId: string) {
    const { data, error } = await this.sb.from('sesiones').select('reto_id').eq('alumno_id', alumnoId);
    if (error) falla('retosHechos', error);
    return [...new Set((data ?? []).map((r: { reto_id: string }) => r.reto_id))];
  }

  async existeMensajeExterno(id: string) {
    const { count, error } = await this.sb
      .from('turnos')
      .select('id', { count: 'exact', head: true })
      .eq('mensaje_externo_id', id);
    if (error) falla('existeMensajeExterno', error);
    return (count ?? 0) > 0;
  }

  async agregarTurno(t: NuevoTurno) {
    const { data, error } = await this.sb
      .from('turnos')
      .insert({
        sesion_id: t.sesion_id,
        rol: t.rol,
        tipo: t.tipo,
        texto: t.texto,
        mensaje_externo_id: t.mensaje_externo_id ?? null,
      })
      .select('id')
      .single();
    if (error?.code === VIOLACION_UNIQUE) return null;
    if (error) falla('agregarTurno', error);
    return (data as { id: string }).id;
  }

  async ultimosTurnos(sesionId: string, n: number) {
    const { data, error } = await this.sb
      .from('turnos')
      .select('*')
      .eq('sesion_id', sesionId)
      .order('creado_en', { ascending: false })
      .limit(n);
    if (error) falla('ultimosTurnos', error);
    return ((data ?? []) as TurnoGuardado[]).reverse();
  }

  async guardarEvaluacion(e: Parameters<Repositorio['guardarEvaluacion']>[0]) {
    const { error } = await this.sb.from('evaluaciones').insert(e);
    if (error) falla('guardarEvaluacion', error);
  }

  async guardarEvaluacionFinal(sesionId: string, e: EvaluacionFinal) {
    const { error } = await this.sb.from('evaluaciones_finales').upsert({
      sesion_id: sesionId,
      resuelto: e.resuelto,
      nivel_ayuda_maximo: e.nivel_ayuda_maximo,
      juez: e,
    });
    if (error) falla('guardarEvaluacionFinal', error);
  }

  async guardarFluidez(sesionId: string, m: MetricasFluidez) {
    const { error } = await this.sb.from('fluidez').upsert({ sesion_id: sesionId, ...m });
    if (error) falla('guardarFluidez', error);
  }

  async grupos() {
    const { data, error } = await this.sb.from('grupos').select('*').order('nombre');
    if (error) falla('grupos', error);
    return (data ?? []) as Grupo[];
  }

  async datosPanel(grupoId: string): Promise<DatosPanel | null> {
    const { data: grupo, error: eg } = await this.sb.from('grupos').select('*').eq('id', grupoId).maybeSingle();
    if (eg) falla('datosPanel grupo', eg);
    if (!grupo) return null;

    // Filtros por grupo con joins (!inner), para no mandar cientos de ids en la URL.
    const [alumnos, sesiones, finales, fluidez, evaluaciones] = await Promise.all([
      todasLasFilas('datosPanel alumnos', (a, b) =>
        this.sb.from('alumnos').select('*').eq('grupo_id', grupoId).order('id').range(a, b),
      ),
      todasLasFilas('datosPanel sesiones', (a, b) =>
        this.sb.from('sesiones').select('*, alumnos!inner(grupo_id)').eq('alumnos.grupo_id', grupoId).order('id').range(a, b),
      ),
      todasLasFilas('datosPanel finales', (a, b) =>
        this.sb
          .from('evaluaciones_finales')
          .select('*, sesiones!inner(alumnos!inner(grupo_id))')
          .eq('sesiones.alumnos.grupo_id', grupoId)
          .order('sesion_id')
          .range(a, b),
      ),
      todasLasFilas('datosPanel fluidez', (a, b) =>
        this.sb
          .from('fluidez')
          .select('*, sesiones!inner(alumnos!inner(grupo_id))')
          .eq('sesiones.alumnos.grupo_id', grupoId)
          .order('sesion_id')
          .range(a, b),
      ),
      todasLasFilas('datosPanel evaluaciones', (a, b) =>
        this.sb
          .from('evaluaciones')
          .select('id, sesion_id, juez->>brecha_probable, sesiones!inner(alumnos!inner(grupo_id))')
          .eq('sesiones.alumnos.grupo_id', grupoId)
          .not('juez->>brecha_probable', 'is', null)
          .order('id')
          .range(a, b),
      ),
    ]);
    const sinJoin = <T,>(filas: unknown[] | null, clave: string) =>
      (filas ?? []).map((f) => {
        const { [clave]: _quitado, ...resto } = f as Record<string, unknown>;
        void _quitado;
        return resto as T;
      });
    const finalesPlanos = sinJoin<Record<string, unknown>>(finales, 'sesiones').map(
      (f) => ({ ...(f.juez as object), sesion_id: f.sesion_id, creado_en: f.creado_en }) as EvaluacionFinalGuardada,
    );
    return {
      grupo: grupo as Grupo,
      alumnos: alumnos as Alumno[],
      sesiones: sinJoin<SesionGuardada>(sesiones, 'alumnos'),
      finales: finalesPlanos,
      fluidez: sinJoin<FluidezGuardada>(fluidez, 'sesiones').map((f) => ({
        ...f,
        duracion_voz_s: Number(f.duracion_voz_s),
        ppm: Number(f.ppm),
        precision_est: f.precision_est === null ? null : Number(f.precision_est),
      })),
      brechas_turno: evaluaciones
        .map((e) => ({ sesion_id: (e as { sesion_id: string }).sesion_id, brecha: (e as { brecha_probable: string | null }).brecha_probable ?? '' }))
        .filter((b) => b.brecha),
    };
  }

  async sesionesDeAlumno(alumnoId: string) {
    const { data, error } = await this.sb
      .from('sesiones')
      .select('*')
      .eq('alumno_id', alumnoId)
      .order('creado_en', { ascending: false });
    if (error) falla('sesionesDeAlumno', error);
    return (data ?? []) as SesionGuardada[];
  }

  async evaluacionFinal(sesionId: string) {
    const { data, error } = await this.sb.from('evaluaciones_finales').select('*').eq('sesion_id', sesionId).maybeSingle();
    if (error) falla('evaluacionFinal', error);
    if (!data) return null;
    return { ...(data.juez as object), sesion_id: data.sesion_id, creado_en: data.creado_en } as EvaluacionFinalGuardada;
  }

  async fluidezDe(sesionId: string) {
    const { data, error } = await this.sb.from('fluidez').select('*').eq('sesion_id', sesionId).maybeSingle();
    if (error) falla('fluidezDe', error);
    if (!data) return null;
    return {
      ...data,
      duracion_voz_s: Number(data.duracion_voz_s),
      ppm: Number(data.ppm),
      precision_est: data.precision_est === null ? null : Number(data.precision_est),
    } as FluidezGuardada;
  }
}
