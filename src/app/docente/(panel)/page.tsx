import Link from 'next/link';
import { GraficaBrechas, TablaAlumnos } from './componentes';
import { grupoElegido, resumenDelGrupo } from './datos';

export const metadata = { title: 'Panel del maestro · Pepe' };

function Indicador({ titulo, valor, detalle }: { titulo: string; valor: string; detalle?: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <p className="text-sm text-muted-foreground">{titulo}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">{valor}</p>
      {detalle && <p className="mt-1 text-xs text-muted-foreground">{detalle}</p>}
    </div>
  );
}

export default async function Panel({ searchParams }: { searchParams: Promise<{ grupo?: string }> }) {
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
          <h1 className="text-2xl font-bold">{r.grupo.nombre}</h1>
          <p className="text-sm text-muted-foreground">
            {[r.grupo.escuela, r.grupo.docente_nombre].filter(Boolean).join(' · ')} · Últimos 7 días
            {r.grupo.es_demo && ' · Datos de demostración'}
          </p>
        </div>
        {grupos.length > 1 && (
          <nav className="flex flex-wrap gap-1" aria-label="Grupos">
            {grupos.map((g) => (
              <Link
                key={g.id}
                href={`/docente?grupo=${g.id}`}
                className={`rounded-full border px-3 py-1 text-sm ${g.id === grupoId ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background'}`}
              >
                {g.nombre}
              </Link>
            ))}
          </nav>
        )}
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Indicadores de la semana">
        <Indicador titulo="Alumnos activos" valor={`${i.activos} / ${i.total}`} detalle="Hicieron al menos un reto" />
        <Indicador
          titulo="Retos resueltos"
          valor={String(i.resueltos_matematicas + i.resueltos_lectura)}
          detalle={`${i.resueltos_matematicas} de matemáticas · ${i.resueltos_lectura} de lectura`}
        />
        <Indicador
          titulo="Ayuda promedio"
          valor={i.ayuda_promedio === null ? '—' : i.ayuda_promedio.toFixed(1)}
          detalle="Nivel de 0 (solo) a 4 (máxima ayuda)"
        />
        <Indicador titulo="Necesitan atención" valor={String(i.necesitan_atencion)} detalle="Ver la lista de abajo" />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-background p-4">
          <h2 className="font-semibold">Dónde se atora el grupo</h2>
          <p className="mb-2 text-sm text-muted-foreground">Alumnos con cada brecha esta semana</p>
          <GraficaBrechas datos={r.brechas} />
        </section>

        <section className="rounded-xl border border-border bg-background p-4">
          <h2 className="font-semibold">Necesitan atención hoy</h2>
          {r.atencion.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nadie necesita atención especial. 🎉</p>
          ) : (
            <ul className="mt-2 divide-y divide-border">
              {r.atencion.map((a) => (
                <li key={a.alumno_id} className="flex items-start gap-3 py-2.5">
                  <span aria-hidden className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-peligro/15 text-xs font-bold">
                    !
                  </span>
                  <div className="min-w-0">
                    <Link href={`/docente/alumno/${a.alumno_id}`} className="font-medium text-primary hover:underline">
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
        <h2 className="font-semibold">Alumnos</h2>
        <TablaAlumnos filas={r.filas} />
        <p className="text-xs text-muted-foreground">
          Fluidez: palabras por minuto de la última lectura en voz alta. Solo la ve el maestro.
        </p>
      </section>
    </div>
  );
}
