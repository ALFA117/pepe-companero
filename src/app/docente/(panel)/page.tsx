import { ArrowDown, CircleCheckBig, FileText, LifeBuoy, TriangleAlert, Users, type LucideIcon } from 'lucide-react';
import { exigirDocente } from '@/lib/docente';
import Link from 'next/link';
import { Contador } from '@/components/contador';
import { PepeAjolote } from '@/components/pepe-ajolote';
import { EscaleraGrupo, GraficaBrechas, ListaAtencion, TablaAlumnos } from './componentes';
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
      <p className="texto-display mt-2 text-4xl tabular-nums">{/^\d+(\.\d)?$/.test(valor) ? <Contador valor={Number(valor)} decimales={valor.includes('.') ? 1 : 0} /> : valor}</p>
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

  const primero = r.atencion[0];
  const resumen = primero
    ? `Esta semana ${i.activos} de ${i.total} alumnos practicaron. Empieza por ${primero.nombre}: ${primero.motivos[0]?.toLowerCase() ?? 'necesita apoyo'}.`
    : `Esta semana ${i.activos} de ${i.total} alumnos practicaron y nadie necesita atención especial.`;

  return (
    <div className="space-y-6">
      <section className="tarjeta-clay relative overflow-hidden p-5 sm:p-6">
        <div className="pointer-events-none absolute -top-10 -right-10 size-48 rounded-full bg-primary/10" aria-hidden />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-center">
          <div className="min-w-0 flex-1 space-y-2">
            <p className="eyebrow text-primary">Tu grupo · últimos 7 días</p>
            <h1 className="texto-display text-4xl sm:text-5xl">{r.grupo.nombre}</h1>
            <p className="text-sm text-muted-foreground">
              {[r.grupo.escuela, r.grupo.docente_nombre].filter(Boolean).join(' · ')}
              {r.grupo.es_demo && (
                <span className="ml-2 inline-block rounded-full bg-trajinera/40 px-2 py-0.5 text-xs font-bold whitespace-nowrap text-foreground">Datos de demostración</span>
              )}
            </p>
            <p className="max-w-2xl text-[17px] font-semibold">{resumen}</p>
            <div className="flex flex-wrap gap-2 pt-1">
              <a
                href="#alumnos"
                className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-primary px-4 text-sm font-extrabold text-primary-foreground shadow-boton transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40"
              >
                <ArrowDown className="size-4" aria-hidden /> Ver a todos los alumnos
              </a>
              <Link
                href="/docente/hojas"
                className="inline-flex min-h-11 items-center gap-2 rounded-2xl border-2 border-border bg-card px-4 text-sm font-extrabold transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40"
              >
                <FileText className="size-4" aria-hidden /> Hojas de práctica
              </Link>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3 md:flex-col">
            <span className="pepe-flota flex size-24 items-center justify-center rounded-3xl bg-ajolote/35 sm:size-28">
              <PepeAjolote vivo cara={i.necesitan_atencion > 0 ? 'pensando' : 'feliz'} className="w-20 sm:w-24" />
            </span>
            {grupos.length > 1 && (
              <nav className="flex flex-wrap gap-1" aria-label="Grupos">
                {grupos.map((g) => (
                  <Link
                    key={g.id}
                    href={`/docente?grupo=${g.id}`}
                    aria-current={g.id === grupoId ? 'page' : undefined}
                    className={`inline-flex min-h-11 items-center rounded-2xl border px-3 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${g.id === grupoId ? 'border-primary bg-primary text-primary-foreground shadow-boton' : 'border-border bg-card hover:bg-muted'}`}
                  >
                    {g.nombre}
                  </Link>
                ))}
              </nav>
            )}
          </div>
        </div>
      </section>

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
        <Indicador titulo="Necesitan atención" valor={String(i.necesitan_atencion)} detalle="Lista de abajo" icono={TriangleAlert} tono="bg-peligro/15 text-peligro" />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="tarjeta-clay p-5">
          <h2 className="texto-titulo text-xl">La escalera del grupo</h2>
          <p className="mb-4 text-sm text-muted-foreground">Cuántos alumnos resolvieron en cada escalón de ayuda</p>
          <EscaleraGrupo filas={r.filas.todos} />
        </section>
        <section className="tarjeta-clay p-5">
          <h2 className="texto-titulo text-xl">Dónde se atora el grupo</h2>
          <p className="mb-2 text-sm text-muted-foreground">Alumnos con cada brecha esta semana</p>
          <GraficaBrechas datos={r.brechas} />
        </section>
      </div>

      <section className="tarjeta-clay p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="texto-titulo text-xl">Necesitan atención hoy</h2>
          {r.atencion.length > 0 && (
            <span className="rounded-full bg-peligro/15 px-2.5 py-0.5 text-sm font-extrabold text-peligro">{r.atencion.length}</span>
          )}
        </div>
        <ListaAtencion items={r.atencion} />
      </section>

      <section id="alumnos" className="scroll-mt-24 space-y-3">
        <h2 className="texto-titulo text-xl">Alumnos</h2>
        <TablaAlumnos filas={r.filas} />
        <p className="text-xs text-muted-foreground">
          Fluidez: palabras por minuto de la última lectura en voz alta. Solo la ve el maestro.
        </p>
      </section>
    </div>
  );
}
