import Link from 'next/link';
import { dependenciasMotor } from '@/motor/servidor';
import { generarHojas, type Hojas } from '@/panel/hojas';
import { grupoElegido, resumenDelGrupo } from '../datos';
import { BotonImprimir } from './imprimir';

export const metadata = { title: 'Hojas de práctica · Pepe' };
export const maxDuration = 60;

const NOMBRE_NIVEL = { basico: 'Básico', medio: 'Medio', avanzado: 'Avanzado' } as const;

export default async function PaginaHojas({ searchParams }: { searchParams: Promise<{ grupo?: string; generar?: string }> }) {
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
          <Link href="/docente" className="text-sm text-primary hover:underline">
            ← Volver al grupo
          </Link>
          <h1 className="mt-2 text-2xl font-bold">Hojas de práctica por nivel</h1>
          <p className="text-sm text-muted-foreground">
            Tres hojas (básico, medio y avanzado) según dónde se atora {resumen?.grupo.nombre ?? 'el grupo'}.
          </p>
        </div>
        <div className="flex gap-2">
          {hojas && <BotonImprimir />}
          {brechas.length > 0 && (
            <Link
              href={`/docente/hojas?generar=1${grupoId ? `&grupo=${grupoId}` : ''}`}
              className="min-h-11 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              {hojas ? 'Generar otras' : 'Generar hojas'}
            </Link>
          )}
        </div>
      </div>

      {brechas.length === 0 && (
        <p className="rounded-xl border border-border bg-background p-6 text-center text-muted-foreground">
          Todavía no hay brechas detectadas para armar hojas.
        </p>
      )}
      {brechas.length > 0 && !hojas && !error && (
        <div className="rounded-xl border border-border bg-background p-4 print:hidden">
          <p className="text-sm font-medium">Se basarán en estas brechas:</p>
          <ul className="mt-2 list-inside list-disc text-sm text-muted-foreground">
            {brechas.map((b) => (
              <li key={b.brecha}>
                {b.etiqueta} ({b.alumnos} alumnos)
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">Generarlas tarda unos 20 segundos.</p>
        </div>
      )}
      {error && (
        <p role="alert" className="rounded-xl bg-peligro/10 p-4 text-sm">
          No se pudieron generar las hojas ahorita (el modelo no respondió). Intenta de nuevo en un minuto.
        </p>
      )}

      {hojas?.hojas.map((h) => (
        <article
          key={h.nivel}
          className="break-after-page rounded-xl border border-border bg-background p-6 print:rounded-none print:border-0 print:p-0"
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
