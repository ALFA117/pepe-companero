import { CircleCheckBig, LifeBuoy, TriangleAlert, Users, type LucideIcon } from 'lucide-react';
import { exigirDocente } from '@/lib/docente';
import Link from 'next/link';
import { GraficaBrechas, TablaAlumnos } from './componentes';
import { grupoElegido, resumenDelGrupo } from './datos';

export const metadata = { title: 'Panel del maestro' };

function Indicador({
  titulo,
  valor,
  detalle,
  icono: Icono,
  tono,
}: {
  titulo: string;
  valor: string;
  detalle?: string;
  icono: LucideIcon;
  tono: string;
}) {
  return (
    <div className="tarjeta-clay p-4 transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-muted-foreground">{titulo}</p>
        <span className={`flex size-9 items-center justify-center rounded-xl ${tono}`}>
          <Icono className="size-[18px]" aria-hidden />
        </span>
      </div>
      <p className="texto-display mt-2 text-4xl tabular-nums">{valor}</p>
      {detalle && <p className="mt-1 text-xs text-muted-foreground">{detalle}</p>}
    </div>
  );
}

export default async function Panel({ searchParams }: { searchParams: Promise<{ grupo?: string }> }) {
  await exigirDocente();
  const { grupo } = await searchParams;
  const { grupos, grupoId } = await grupoElegido(grupo);
  if (!grupoId) {
    return <p className="text-muted-foreground">Todavía no hay grupos. Corre el seed de datos de demo.</p>;
  }
  const r = await resumenDelGrupo(grupoId);
  if (!r) return null;
  const i = r.indicadores;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow text-primary">Tu grupo</p>
          <h1 className="texto-display text-4xl">{r.grupo.nombre}</h1>
          <p className="text-sm text-muted-foreground">
            {[r.grupo.escuela, r.grupo.docente_nombre].filter(Boolean).join(' · ')} · Últimos 7 días
            {r.grupo.es_demo && (
              <span className="ml-2 rounded-full bg-trajinera/40 px-2 py-0.5 text-xs font-bold text-trajinera-tinta">Datos de demostración</span>
            )}
          </p>
        </div>
        {grupos.length > 1 && (
          <nav className="flex flex-wrap gap-1" aria-label="Grupos">
            {grupos.map((g) => (
              <Link
                key={g.id}
                href={`/docente?grupo=${g.id}`}
                aria-current={g.id === grupoId ? 'page' : undefined}
                className={`inline-flex min-h-11 items-center rounded-2xl border px-4 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${g.id === grupoId ? 'border-primary bg-primary text-primary-foreground shadow-boton' : 'border-border bg-card hover:bg-muted'}`}
              >
                {g.nombre}
              </Link>
            ))}
          </nav>
        )}
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Indicadores de la semana">
        <Indicador titulo="Alumnos activos" valor={`${i.activos} / ${i.total}`} detalle="Hicieron al menos un reto" icono={Users} tono="bg-primary/15 text-primary" />
        <Indicador
          titulo="Retos resueltos"
          valor={String(i.resueltos_matematicas + i.resueltos_lectura)}
          detalle={`${i.resueltos_matematicas} de matemáticas · ${i.resueltos_lectura} de lectura`}
          icono={CircleCheckBig}
          tono="bg-exito/15 text-exito"
        />
        <Indicador
          titulo="Ayuda promedio"
          valor={i.ayuda_promedio === null ? '—' : i.ayuda_promedio.toFixed(1)}
          detalle="Nivel de 0 (solo) a 4 (máxima ayuda)"
          icono={LifeBuoy}
          tono="bg-trajinera/35 text-trajinera-tinta"
        />
        <Indicador titulo="Necesitan atención" valor={String(i.necesitan_atencion)} detalle="Ver la lista de abajo" icono={TriangleAlert} tono="bg-peligro/15 text-peligro" />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="tarjeta-clay p-5">
          <h2 className="texto-titulo text-xl">Dónde se atora el grupo</h2>
          <p className="mb-2 text-sm text-muted-foreground">Alumnos con cada brecha esta semana</p>
          <GraficaBrechas datos={r.brechas} />
        </section>

        <section className="tarjeta-clay p-5">
          <h2 className="texto-titulo text-xl">Necesitan atención hoy</h2>
          {r.atencion.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nadie necesita atención especial esta semana.</p>
          ) : (
            <ul className="mt-2 divide-y divide-border">
              {r.atencion.map((a) => (
                <li key={a.alumno_id} className="flex items-start gap-3 py-2.5">
                  <span aria-hidden className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-peligro/15 text-peligro">
                    <TriangleAlert className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <Link href={`/docente/alumno/${a.alumno_id}`} className="font-bold text-primary hover:underline">
                      {a.nombre}
                    </Link>
                    <p className="text-sm text-muted-foreground">{a.motivos.join(' · ')}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="space-y-3">
        <h2 className="texto-titulo text-xl">Alumnos</h2>
        <TablaAlumnos filas={r.filas} />
        <p className="text-xs text-muted-foreground">
          Fluidez: palabras por minuto de la última lectura en voz alta. Solo la ve el maestro.
        </p>
      </section>
    </div>
  );
}
