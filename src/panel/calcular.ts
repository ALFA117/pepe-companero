/**
 * Cálculos del panel del maestro (sección 11 del brief). Funciones puras sobre
 * los datos crudos del grupo, para probarlas sin base de datos.
 */
import type { DatosPanel, FluidezGuardada, SesionGuardada } from '@/db/repositorio';
import { BRECHA_ALERTA } from '@/motor/intencion';
import type { Reto } from '@/motor/tipos';

export const DIAS_SEMANA = 7;
export const UMBRAL_PIDE_RESPUESTA = 5;
/** "Lee muy por debajo de la mediana": menos de este porcentaje. */
export const FRACCION_MEDIANA_LECTURA = 0.7;
const MIN_LECTURAS_PARA_MEDIANA = 3;

export type Materia = Reto['materia'];
export type Estado = 'avanzando' | 'con_ayuda' | 'atorado' | 'sin_empezar';

export interface InfoReto {
  materia: Materia;
  concepto: string;
  titulo: string;
}

export interface FilaAlumno {
  alumno_id: string;
  nombre: string;
  codigo: string;
  materia: Materia | null;
  ultimo_reto: string | null;
  /** Nivel de ayuda máximo del último reto (0 a 4). */
  ayuda: number | null;
  /** Retos intentados en la semana. */
  intentos: number;
  ppm: number | null;
  estado: Estado;
}

export interface MotivoAtencion {
  alumno_id: string;
  nombre: string;
  motivos: string[];
}

export interface ResumenPanel {
  grupo: DatosPanel['grupo'];
  indicadores: {
    activos: number;
    total: number;
    resueltos_matematicas: number;
    resueltos_lectura: number;
    ayuda_promedio: number | null;
    necesitan_atencion: number;
  };
  /** Top 4 de brechas, contadas por alumno. */
  brechas: { brecha: string; etiqueta: string; alumnos: number }[];
  atencion: MotivoAtencion[];
  filas: Record<'todos' | Materia, FilaAlumno[]>;
  mediana_ppm: number | null;
}

/** Palabras que pierden el acento en las claves snake_case de los conceptos. */
const ACENTOS: Record<string, string> = {
  informacion: 'información',
  multiplicacion: 'multiplicación',
  fraccion: 'fracción',
  operacion: 'operación',
  calculo: 'cálculo',
  parrafos: 'párrafos',
  contaminacion: 'contaminación',
  jerarquia: 'jerarquía',
  inferencia: 'inferencia',
};

export function humanizar(clave: string): string {
  const t = clave
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((p) => ACENTOS[p] ?? p)
    .join(' ');
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function infoDeRetos(banco: readonly Reto[]): Map<string, InfoReto> {
  return new Map(
    banco.map((r) => [r.id, { materia: r.materia, concepto: r.concepto, titulo: r.texto?.titulo ?? humanizar(r.concepto) }]),
  );
}

export function mediana(xs: readonly number[]): number | null {
  if (xs.length === 0) return null;
  const o = [...xs].sort((a, b) => a - b);
  const m = Math.floor(o.length / 2);
  return o.length % 2 ? o[m]! : (o[m - 1]! + o[m]!) / 2;
}

const recientesPrimero = (a: SesionGuardada, b: SesionGuardada) => b.creado_en.localeCompare(a.creado_en);

export function calcularPanel(d: DatosPanel, retos: Map<string, InfoReto>, ahora = new Date()): ResumenPanel {
  const desde = new Date(ahora.getTime() - DIAS_SEMANA * 24 * 3600 * 1000).toISOString();
  const deLaSemana = (s: SesionGuardada) => s.actualizado_en >= desde;
  const materiaDe = (s: SesionGuardada) => retos.get(s.reto_id)?.materia ?? null;

  const iniciadas = d.sesiones.filter((s) => s.fase !== 'pendiente');
  const finalPorSesion = new Map(d.finales.map((f) => [f.sesion_id, f]));
  const sesionPorId = new Map(d.sesiones.map((s) => [s.id, s]));
  const porAlumno = new Map<string, SesionGuardada[]>();
  for (const s of iniciadas) porAlumno.set(s.alumno_id, [...(porAlumno.get(s.alumno_id) ?? []), s]);
  for (const xs of porAlumno.values()) xs.sort(recientesPrimero);

  // Fluidez: la lectura más reciente de cada alumno.
  const fluidezPorAlumno = new Map<string, FluidezGuardada>();
  for (const f of [...d.fluidez].sort((a, b) => a.creado_en.localeCompare(b.creado_en))) {
    const s = sesionPorId.get(f.sesion_id);
    if (s) fluidezPorAlumno.set(s.alumno_id, f);
  }
  const ppms = [...fluidezPorAlumno.values()].map((f) => f.ppm);
  const medianaPpm = ppms.length >= MIN_LECTURAS_PARA_MEDIANA ? mediana(ppms) : null;

  // ── Indicadores ──
  const semana = iniciadas.filter(deLaSemana);
  const activos = new Set(semana.map((s) => s.alumno_id)).size;
  const resueltas = semana.filter((s) => s.fase === 'terminado' && finalPorSesion.get(s.id)?.resuelto);
  const terminadas = semana.filter((s) => s.fase === 'terminado');
  const ayudaPromedio =
    terminadas.length > 0 ? Math.round((terminadas.reduce((t, s) => t + s.nivel_max, 0) / terminadas.length) * 10) / 10 : null;

  // ── Necesitan atención ──
  const nombre = new Map(d.alumnos.map((a) => [a.id, a.nombre]));
  const atencion: MotivoAtencion[] = [];
  // Mensajes de riesgo (ver motor/intencion.ts): van primero y no cuentan como brecha.
  const alumnoDeSesion = new Map(d.sesiones.map((s) => [s.id, s.alumno_id]));
  const conAlerta = new Set(
    d.brechas_turno.filter((b) => b.brecha === BRECHA_ALERTA).map((b) => alumnoDeSesion.get(b.sesion_id)),
  );
  for (const a of d.alumnos) {
    const motivos: string[] = [];
    if (conAlerta.has(a.id)) motivos.push('⚠️ Escribió algo que preocupa sobre su bienestar: lee su conversación hoy');
    const ss = porAlumno.get(a.id) ?? [];
    const atorada = ss.find((s) => deLaSemana(s) && s.requiere_docente);
    if (atorada) {
      motivos.push(`Se atoró en ${humanizar(retos.get(atorada.reto_id)?.concepto ?? atorada.reto_id).toLowerCase()}`);
    }
    const ultimasTerminadas = ss.filter((s) => s.fase === 'terminado').slice(0, 2);
    if (!atorada && ultimasTerminadas.length === 2 && ultimasTerminadas.every((s) => s.nivel_max === 4)) {
      motivos.push('Necesitó la ayuda máxima en 2 retos seguidos');
    }
    const pidio = ss.filter(deLaSemana).reduce((t, s) => t + s.contador_pide_respuesta, 0);
    if (pidio >= UMBRAL_PIDE_RESPUESTA) motivos.push(`Pidió la respuesta ${pidio} veces esta semana`);
    const f = fluidezPorAlumno.get(a.id);
    if (f && medianaPpm !== null && f.ppm < medianaPpm * FRACCION_MEDIANA_LECTURA) {
      motivos.push(`Lee a ${Math.round(f.ppm)} ppm; la mediana del grupo es ${Math.round(medianaPpm)}`);
    }
    if (motivos.length > 0) atencion.push({ alumno_id: a.id, nombre: nombre.get(a.id) ?? a.codigo, motivos });
  }
  atencion.sort((x, y) => Number(conAlerta.has(y.alumno_id)) - Number(conAlerta.has(x.alumno_id)));

  // ── Dónde se atora el grupo: brechas contadas por alumno ──
  const alumnosPorBrecha = new Map<string, Set<string>>();
  const sumar = (sesionId: string, brecha: string) => {
    const s = sesionPorId.get(sesionId);
    const clave = brecha.trim().toLowerCase();
    if (!s || !clave || clave === BRECHA_ALERTA || !deLaSemana(s)) return;
    alumnosPorBrecha.set(clave, (alumnosPorBrecha.get(clave) ?? new Set()).add(s.alumno_id));
  };
  for (const f of d.finales) for (const b of f.brechas_detectadas) sumar(f.sesion_id, b);
  for (const b of d.brechas_turno) sumar(b.sesion_id, b.brecha);
  const brechas = [...alumnosPorBrecha.entries()]
    .map(([brecha, al]) => ({ brecha, etiqueta: humanizar(brecha), alumnos: al.size }))
    .sort((a, b) => b.alumnos - a.alumnos || a.brecha.localeCompare(b.brecha))
    .slice(0, 4);

  // ── Tabla ──
  const atascados = new Set(atencion.map((x) => x.alumno_id));
  const fila = (alumno: DatosPanel['alumnos'][number], ss: SesionGuardada[]): FilaAlumno => {
    const ultima = ss[0];
    const fin = ultima ? finalPorSesion.get(ultima.id) : undefined;
    let estado: Estado = 'sin_empezar';
    if (ultima) {
      if (ultima.requiere_docente || (ultima.fase === 'nivel' && ultima.nivel === 4)) estado = 'atorado';
      else if (ultima.fase === 'terminado' && fin?.resuelto && ultima.nivel_max <= 1) estado = 'avanzando';
      else estado = 'con_ayuda';
    }
    const materia = ultima ? materiaDe(ultima) : null;
    return {
      alumno_id: alumno.id,
      nombre: alumno.nombre,
      codigo: alumno.codigo,
      materia,
      ultimo_reto: ultima ? (retos.get(ultima.reto_id)?.titulo ?? ultima.reto_id) : null,
      ayuda: ultima ? ultima.nivel_max : null,
      intentos: ss.filter(deLaSemana).length,
      ppm: fluidezPorAlumno.has(alumno.id) ? Math.round(fluidezPorAlumno.get(alumno.id)!.ppm) : null,
      estado,
    };
  };
  const ordenar = (xs: FilaAlumno[]) =>
    xs.sort(
      (a, b) =>
        Number(atascados.has(b.alumno_id)) - Number(atascados.has(a.alumno_id)) ||
        ORDEN_ESTADO[a.estado] - ORDEN_ESTADO[b.estado] ||
        a.nombre.localeCompare(b.nombre, 'es'),
    );
  const filas = {
    todos: ordenar(d.alumnos.map((a) => fila(a, porAlumno.get(a.id) ?? []))),
    matematicas: ordenar(
      d.alumnos
        .map((a) => fila(a, (porAlumno.get(a.id) ?? []).filter((s) => materiaDe(s) === 'matematicas')))
        .filter((f) => f.estado !== 'sin_empezar'),
    ),
    lectura: ordenar(
      d.alumnos
        .map((a) => fila(a, (porAlumno.get(a.id) ?? []).filter((s) => materiaDe(s) === 'lectura')))
        .filter((f) => f.estado !== 'sin_empezar'),
    ),
  };

  return {
    grupo: d.grupo,
    indicadores: {
      activos,
      total: d.alumnos.length,
      resueltos_matematicas: resueltas.filter((s) => materiaDe(s) === 'matematicas').length,
      resueltos_lectura: resueltas.filter((s) => materiaDe(s) === 'lectura').length,
      ayuda_promedio: ayudaPromedio,
      necesitan_atencion: atencion.length,
    },
    brechas,
    atencion,
    filas,
    mediana_ppm: medianaPpm,
  };
}

const ORDEN_ESTADO: Record<Estado, number> = { atorado: 0, con_ayuda: 1, avanzando: 2, sin_empezar: 3 };
