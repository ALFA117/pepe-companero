'use client';

import { AnimatePresence, motion } from 'motion/react';
import { BookOpenText, ChevronRight, CircleDashed, LifeBuoy, Search, TrendingUp, TriangleAlert, type LucideIcon } from 'lucide-react';
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

/** Ayuda usada: mini escalera de 5 escalones (niveles 0 a 4), llena hasta el nivel alcanzado. */
export function PuntosAyuda({ nivel }: { nivel: number | null }) {
  if (nivel === null) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="inline-flex items-end gap-[3px]" role="img" aria-label={`Nivel de ayuda ${nivel} de 4`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className={`w-2 rounded-[3px] ${i <= nivel ? '' : 'bg-muted-foreground/20'}`}
          style={{ height: 6 + i * 3, ...(i <= nivel ? { background: ESCALA_AYUDA[nivel] } : {}) }}
        />
      ))}
      <span className="ml-1.5 text-xs font-bold tabular-nums text-muted-foreground">{nivel}</span>
    </span>
  );
}

/** Secuencial de un solo tono, de claro a oscuro. */
const ESCALA_AYUDA = ['#7fcfbd', '#4fb39d', '#22977f', '#0b7a66', '#04594b'];

const ESTADOS: Record<Estado, { texto: string; Icono: LucideIcon; clase: string }> = {
  avanzando: { texto: 'Avanzando', Icono: TrendingUp, clase: 'bg-exito/15 text-foreground' },
  con_ayuda: { texto: 'Con ayuda', Icono: LifeBuoy, clase: 'bg-aviso/25 text-foreground' },
  atorado: { texto: 'Atorado', Icono: TriangleAlert, clase: 'bg-peligro/15 text-foreground' },
  sin_empezar: { texto: 'Sin empezar', Icono: CircleDashed, clase: 'bg-muted text-muted-foreground' },
};

export function EtiquetaEstado({ estado }: { estado: Estado }) {
  const e = ESTADOS[estado];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap ${e.clase}`}>
      <e.Icono className="size-3.5" aria-hidden />
      {e.texto}
    </span>
  );
}

const TONOS_AVATAR = ['bg-primary/20 text-foreground', 'bg-ajolote/50 text-foreground', 'bg-trajinera/45 text-foreground'];

/** Círculo con las iniciales del alumno (sin fotos de menores). */
export function Avatar({ nombre, grande = false }: { nombre: string; grande?: boolean }) {
  const partes = nombre.trim().split(/\s+/);
  const ini = `${partes[0]?.[0] ?? ''}${partes[1]?.[0] ?? ''}`.toUpperCase();
  let h = 0;
  for (const c of nombre) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-2xl font-extrabold ${TONOS_AVATAR[h % TONOS_AVATAR.length]} ${
        grande ? 'size-16 text-2xl' : 'size-10 text-sm'
      }`}
    >
      {ini}
    </span>
  );
}

const NOMBRES_NIVEL = ['Solo', 'Acotar', 'Sentido común', 'Juntos', 'Repaso'];

/** Cuántos alumnos resolvieron su último reto en cada escalón de ayuda. */
export function EscaleraGrupo({ filas }: { filas: FilaAlumno[] }) {
  const conts = [0, 1, 2, 3, 4].map((n) => filas.filter((f) => f.ayuda === n).length);
  const sinDato = filas.filter((f) => f.ayuda === null).length;
  const max = Math.max(1, ...conts);
  return (
    <figure>
      <div className="flex h-48 items-end gap-2 sm:gap-3" aria-hidden>
        {conts.map((c, n) => (
          <div key={n} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
            <span className="texto-titulo text-xl tabular-nums">{c}</span>
            <motion.div
              initial={{ scaleY: 0.4 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true }}
              transition={{ type: 'spring', stiffness: 220, damping: 22, delay: n * 0.05 }}
              className="w-full origin-bottom rounded-t-xl rounded-b-md"
              style={{ height: `${Math.max(8, (c / max) * 100)}%`, background: ESCALA_AYUDA[n] }}
            />
            <span className="font-mono text-xs font-bold text-muted-foreground">{n}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 hidden justify-between gap-2 text-[12px] text-muted-foreground sm:flex" aria-hidden>
        {NOMBRES_NIVEL.map((x) => (
          <span key={x} className="flex-1 text-center">
            {x}
          </span>
        ))}
      </div>
      <figcaption className="mt-3 text-sm text-muted-foreground">
        Nivel de ayuda del último reto de cada alumno: 0 = lo resolvió solo, 4 = necesitó repasar un tema anterior.
        {sinDato > 0 && ` ${sinDato} todavía no hacen ningún reto.`}
        <span className="sr-only">
          {conts.map((c, n) => `Nivel ${n}: ${c} alumnos`).join('. ')}
        </span>
      </figcaption>
    </figure>
  );
}

function iconoMotivo(m: string): LucideIcon {
  if (/ppm|lee/i.test(m)) return BookOpenText;
  if (/m[aá]xima/i.test(m)) return LifeBuoy;
  return TriangleAlert;
}

/** Lista compacta de quién necesita atención, con los primeros 6 y botón para ver todos. */
export function ListaAtencion({ items }: { items: ResumenPanel['atencion'] }) {
  const [todos, setTodos] = useState(false);
  if (items.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Nadie necesita atención especial esta semana.</p>;
  }
  const visibles = todos ? items : items.slice(0, 6);
  return (
    <div className="space-y-3">
      <ul className="grid gap-2">
        <AnimatePresence initial={false}>
          {visibles.map((a, i) => (
            <motion.li
              key={a.alumno_id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28, delay: todos ? 0 : Math.min(i, 6) * 0.03 }}
            >
              <Link
                href={`/docente/alumno/${a.alumno_id}`}
                className="group flex items-center gap-3 rounded-2xl border-2 border-transparent p-2 transition-colors hover:border-border hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Avatar nombre={a.nombre} />
                <span className="min-w-0 flex-1">
                  <span className="block font-bold group-hover:text-primary">{a.nombre}</span>
                  <span className="mt-0.5 flex flex-wrap gap-1.5">
                    {a.motivos.map((m) => {
                      const I = iconoMotivo(m);
                      return (
                        <span key={m} className="inline-flex items-start gap-1 rounded-xl bg-peligro/10 px-2 py-1 text-xs leading-snug text-foreground">
                          <I className="mt-px size-3.5 shrink-0 text-peligro" aria-hidden />
                          {m}
                        </span>
                      );
                    })}
                  </span>
                </span>
                <ChevronRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      {items.length > 6 && (
        <button
          type="button"
          onClick={() => setTodos((x) => !x)}
          className="min-h-11 w-full cursor-pointer rounded-2xl border-2 border-border bg-card text-sm font-extrabold text-primary hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {todos ? 'Ver menos' : `Ver los ${items.length}`}
        </button>
      )}
    </div>
  );
}

const FILTROS = [
  { clave: 'todos', texto: 'Todos' },
  { clave: 'matematicas', texto: 'Matemáticas' },
  { clave: 'lectura', texto: 'Lectura' },
] as const;

export function TablaAlumnos({ filas }: { filas: ResumenPanel['filas'] }) {
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]['clave']>('todos');
  const [busqueda, setBusqueda] = useState('');
  const q = busqueda.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const lista: FilaAlumno[] = filas[filtro].filter(
    (f) => !q || `${f.nombre} ${f.codigo}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q),
  );

  return (
    <div className="space-y-3">
      <label className="relative block">
        <span className="sr-only">Buscar alumno</span>
        <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o código…"
          className="min-h-12 w-full rounded-2xl border-2 border-input bg-card/80 pr-4 pl-11 text-[16px] outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-ring/25"
        />
      </label>
      <div className="relative flex gap-1 rounded-2xl bg-muted/80 p-1" role="tablist" aria-label="Filtrar por materia">
        <span
          aria-hidden
          className="pointer-events-none absolute top-1 bottom-1 left-1 rounded-xl bg-card shadow-clay transition-transform duration-300 ease-out motion-reduce:transition-none"
          style={{
            width: `calc((100% - 0.5rem - ${(FILTROS.length - 1) * 0.25}rem) / ${FILTROS.length})`,
            transform: `translateX(calc(${Math.max(0, FILTROS.findIndex((f) => f.clave === filtro))} * (100% + 0.25rem)))`,
          }}
        />
        {FILTROS.map((f) => (
          <button
            key={f.clave}
            role="tab"
            aria-selected={filtro === f.clave}
            onClick={() => setFiltro(f.clave)}
            className={`relative min-h-11 min-w-0 flex-1 cursor-pointer rounded-xl px-1.5 text-[13px] font-bold transition-colors sm:px-3 sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              filtro === f.clave ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="relative">
              {f.texto}
              <span className="ml-1 text-xs tabular-nums text-muted-foreground">{filas[f.clave].length}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="tarjeta-clay overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
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
                  {q ? `Nadie coincide con “${busqueda.trim()}”. Revisa el nombre o el código.` : 'Nadie ha hecho retos de esta materia todavía.'}
                </td>
              </tr>
            )}
            {lista.map((f) => (
              <tr key={f.alumno_id} className="border-t border-border hover:bg-muted/40">
                <td className="px-3 py-2.5">
                  <span className="flex items-center gap-3">
                    <Avatar nombre={f.nombre} />
                    <span>
                      <Link href={`/docente/alumno/${f.alumno_id}`} className="inline-flex min-h-11 items-center font-bold text-primary hover:underline">
                        {f.nombre}
                      </Link>
                      <span className="-mt-2 block font-mono text-xs text-muted-foreground">{f.codigo}</span>
                    </span>
                  </span>
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
