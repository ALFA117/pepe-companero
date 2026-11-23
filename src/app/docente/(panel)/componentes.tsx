'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Estado, FilaAlumno, ResumenPanel } from '@/panel/calcular';

/** Color de las barras: validado (contraste y croma) contra la superficie clara. */
const COLOR_BARRA = '#00876f';

export function GraficaBrechas({ datos }: { datos: ResumenPanel['brechas'] }) {
  if (datos.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Todavía no hay brechas detectadas esta semana.</p>;
  }
  return (
    <figure>
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={datos} layout="vertical" margin={{ top: 4, right: 40, bottom: 4, left: 4 }} barCategoryGap={10}>
            <XAxis type="number" hide allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="etiqueta"
              width={150}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 13, fill: 'var(--foreground)' }}
            />
            <Tooltip
              cursor={{ fill: 'var(--muted)' }}
              formatter={(v) => [`${v} alumnos`, 'Se atoran']}
              contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }}
            />
            <Bar dataKey="alumnos" fill={COLOR_BARRA} radius={[0, 4, 4, 0]} maxBarSize={28}>
              <LabelList dataKey="alumnos" position="right" style={{ fontSize: 13, fill: 'var(--foreground)' }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="sr-only">
        {datos.map((d) => `${d.etiqueta}: ${d.alumnos} alumnos`).join('. ')}
      </figcaption>
    </figure>
  );
}

/** Ayuda usada: 5 puntos (niveles 0 a 4), llenos hasta el nivel alcanzado. */
export function PuntosAyuda({ nivel }: { nivel: number | null }) {
  if (nivel === null) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="inline-flex items-center gap-1" role="img" aria-label={`Nivel de ayuda ${nivel} de 4`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className={`size-2.5 rounded-full ${i <= nivel ? '' : 'border border-muted-foreground/40'}`}
          style={i <= nivel ? { background: ESCALA_AYUDA[nivel] } : undefined}
        />
      ))}
      <span className="ml-1 text-xs tabular-nums text-muted-foreground">{nivel}</span>
    </span>
  );
}

/** Secuencial de un solo tono, de claro a oscuro. */
const ESCALA_AYUDA = ['#7fcfbd', '#4fb39d', '#22977f', '#0b7a66', '#04594b'];

const ESTADOS: Record<Estado, { texto: string; icono: string; clase: string }> = {
  avanzando: { texto: 'Avanzando', icono: '↗', clase: 'bg-exito/15 text-foreground' },
  con_ayuda: { texto: 'Con ayuda', icono: '•', clase: 'bg-aviso/20 text-foreground' },
  atorado: { texto: 'Atorado', icono: '!', clase: 'bg-peligro/15 text-foreground' },
  sin_empezar: { texto: 'Sin empezar', icono: '–', clase: 'bg-muted text-muted-foreground' },
};

export function EtiquetaEstado({ estado }: { estado: Estado }) {
  const e = ESTADOS[estado];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${e.clase}`}>
      <span aria-hidden className="font-bold">
        {e.icono}
      </span>
      {e.texto}
    </span>
  );
}

const FILTROS = [
  { clave: 'todos', texto: 'Todos' },
  { clave: 'matematicas', texto: 'Matemáticas' },
  { clave: 'lectura', texto: 'Lectura' },
] as const;

export function TablaAlumnos({ filas }: { filas: ResumenPanel['filas'] }) {
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]['clave']>('todos');
  const lista: FilaAlumno[] = filas[filtro];

  return (
    <div className="space-y-3">
      <div className="flex gap-1 rounded-lg bg-muted p-1" role="tablist" aria-label="Filtrar por materia">
        {FILTROS.map((f) => (
          <button
            key={f.clave}
            role="tab"
            aria-selected={filtro === f.clave}
            onClick={() => setFiltro(f.clave)}
            className={`min-h-9 flex-1 rounded-md px-3 text-sm font-medium transition-colors ${
              filtro === f.clave ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {f.texto}
            <span className="ml-1.5 text-xs tabular-nums text-muted-foreground">{filas[f.clave].length}</span>
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2.5 font-medium">Alumno</th>
              <th className="px-3 py-2.5 font-medium">Materia</th>
              <th className="px-3 py-2.5 font-medium">Último reto</th>
              <th className="px-3 py-2.5 font-medium">Ayuda usada</th>
              <th className="px-3 py-2.5 text-right font-medium">Intentos</th>
              <th className="px-3 py-2.5 text-right font-medium">Fluidez</th>
              <th className="px-3 py-2.5 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {lista.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                  Nadie ha hecho retos de esta materia todavía.
                </td>
              </tr>
            )}
            {lista.map((f) => (
              <tr key={f.alumno_id} className="border-t border-border hover:bg-muted/40">
                <td className="px-3 py-2.5">
                  <Link href={`/docente/alumno/${f.alumno_id}`} className="font-medium text-primary hover:underline">
                    {f.nombre}
                  </Link>
                  <span className="block font-mono text-[11px] text-muted-foreground">{f.codigo}</span>
                </td>
                <td className="px-3 py-2.5">{f.materia === 'matematicas' ? 'Matemáticas' : f.materia === 'lectura' ? 'Lectura' : '—'}</td>
                <td className="px-3 py-2.5">{f.ultimo_reto ?? '—'}</td>
                <td className="px-3 py-2.5">
                  <PuntosAyuda nivel={f.ayuda} />
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">{f.intentos}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{f.ppm !== null ? `${f.ppm} ppm` : '—'}</td>
                <td className="px-3 py-2.5">
                  <EtiquetaEstado estado={f.estado} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
