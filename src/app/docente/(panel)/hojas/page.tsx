import { exigirDocente } from '@/lib/docente';
import { ArrowLeft, FileText, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { PepeAjolote } from '@/components/pepe-ajolote';
import { dependenciasMotor } from '@/motor/servidor';
import { generarHojas, type Hojas } from '@/panel/hojas';
import { grupoElegido, resumenDelGrupo } from '../datos';
import { BotonImprimir } from './imprimir';

export const metadata = { title: 'Hojas de práctica · Pepe' };
export const maxDuration = 60;

const NOMBRE_NIVEL = { basico: 'Básico', medio: 'Medio', avanzado: 'Avanzado' } as const;

export default async function PaginaHojas({ searchParams }: { searchParams: Promise<{ grupo?: string; generar?: string }> }) {
  await exigirDocente();
  const { grupo, generar } = await searchParams;
  const { grupoId } = await grupoElegido(grupo);
  const resumen = grupoId ? await resumenDelGrupo(grupoId) : null;
  const brechas = resumen?.brechas ?? [];

  let hojas: Hojas | null = null;
  let error = false;
  if (generar && brechas.length > 0) {
    try {
      hojas = await generarHojas(dependenciasMotor().generar, brechas, resumen!.grupo.nombre);
    } catch (err) {
      console.error('[hojas]', err);
      error = true;
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
        <div>
          <Link
            href="/docente"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl text-sm font-bold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="size-4" aria-hidden /> Volver al grupo
          </Link>
          <p className="eyebrow mt-1 text-primary">Para imprimir</p>
          <h1 className="texto-display text-4xl">Hojas de práctica</h1>
          <p className="text-sm text-muted-foreground">
            Tres hojas (básico, medio y avanzado) según dónde se atora {resumen?.grupo.nombre ?? 'el grupo'}.
          </p>
        </div>
        <div className="flex gap-2">
          {hojas && <BotonImprimir />}
          {brechas.length > 0 && (
            <Link
              href={`/docente/hojas?generar=1${grupoId ? `&grupo=${grupoId}` : ''}`}
              className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-primary px-5 font-extrabold text-primary-foreground shadow-boton transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40"
            >
              <FileText className="size-4" aria-hidden />
              {hojas ? 'Generar otras' : 'Generar hojas'}
            </Link>
          )}
        </div>
      </div>

      {brechas.length === 0 && (
        <p className="tarjeta-clay print:shadow-none p-6 text-center text-muted-foreground">
          Todavía no hay brechas detectadas para armar hojas.
        </p>
      )}
      {brechas.length > 0 && !hojas && !error && (
        <div className="grid gap-6 print:hidden lg:grid-cols-[1fr_1.1fr]">
          <section className="tarjeta-clay p-5">
            <h2 className="texto-titulo text-xl">Se basarán en estas brechas</h2>
            <p className="mb-4 text-sm text-muted-foreground">Lo que más le cuesta al grupo esta semana</p>
            <ul className="space-y-3">
              {brechas.map((b) => {
                const max = Math.max(...brechas.map((x) => x.alumnos));
                return (
                  <li key={b.brecha}>
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="font-bold">{b.etiqueta}</span>
                      <span className="tabular-nums text-muted-foreground">{b.alumnos} alumnos</span>
                    </div>
                    <div className="mt-1 h-3 overflow-hidden rounded-full bg-muted">
                      <div className="h-full origin-left rounded-full bg-primary" style={{ width: `${(b.alumnos / max) * 100}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 text-xs text-muted-foreground">Generarlas tarda unos 20 segundos.</p>
          </section>
          <section aria-label="Vista previa" className="space-y-3">
            <p className="text-sm font-bold text-muted-foreground">Así se van a ver: tres hojas, una por nivel</p>
            <div className="flex items-end justify-center gap-3 py-2">
              {(['basico', 'medio', 'avanzado'] as const).map((n, k) => (
                <div
                  key={n}
                  className={`tarjeta-clay w-1/3 max-w-[11rem] space-y-2 p-3 transition-transform hover:-translate-y-1 motion-reduce:hover:translate-y-0 ${k === 1 ? '-translate-y-3' : ''} ${k === 0 ? '-rotate-3' : k === 2 ? 'rotate-3' : ''}`}
                >
                  <p className="eyebrow text-[11px] text-primary">{NOMBRE_NIVEL[n]}</p>
                  <div className="h-2 w-3/4 rounded bg-foreground/70" aria-hidden />
                  {[0, 1, 2, 3].map((x) => (
                    <div key={x} className="flex items-center gap-1.5" aria-hidden>
                      <span className="size-2 rounded-full bg-primary/50" />
                      <span className="h-1.5 flex-1 rounded bg-muted-foreground/25" />
                    </div>
                  ))}
                  <div className="h-8 rounded-md border border-dashed border-muted-foreground/40" aria-hidden />
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
      {error && (
        <div role="alert" className="tarjeta-clay flex flex-col items-center gap-3 p-6 text-center">
          <PepeAjolote vivo cara="pensando" className="w-24" />
          <p className="font-bold">No se pudieron generar las hojas ahorita.</p>
          <p className="text-sm text-muted-foreground">El modelo de IA no respondió (puede ser el límite por minuto). Espera un minuto y vuelve a intentar.</p>
          <Link
            href={`/docente/hojas?generar=1${grupoId ? `&grupo=${grupoId}` : ''}`}
            className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-primary px-4 text-sm font-extrabold text-primary-foreground shadow-boton focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40"
          >
            <RotateCcw className="size-4" aria-hidden /> Reintentar
          </Link>
        </div>
      )}

      {hojas?.hojas.map((h) => (
        <article
          key={h.nivel}
          className="break-after-page tarjeta-clay print:shadow-none p-6 print:rounded-none print:border-0 print:p-0"
        >
          <header className="mb-4 border-b border-border pb-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Nivel {NOMBRE_NIVEL[h.nivel]} · {resumen?.grupo.nombre}
            </p>
            <h2 className="text-xl font-bold">{h.titulo}</h2>
            <p className="text-sm text-muted-foreground">{h.instrucciones}</p>
            <p className="mt-3 text-sm">Nombre: ______________________________ Fecha: ____________</p>
          </header>
          <ol className="list-decimal space-y-6 pl-5">
            {h.ejercicios.map((e, i) => (
              <li key={i} className="pl-1">
                {e.enunciado}
                <div className="mt-2 h-12 border-b border-dashed border-border" aria-hidden />
              </li>
            ))}
          </ol>
        </article>
      ))}
    </div>
  );
}
