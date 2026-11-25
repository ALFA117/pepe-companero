import { ArrowLeft, ChartColumn, FileText, LockKeyhole, TriangleAlert } from 'lucide-react';
import { CampoPin } from './campo-pin';
import Link from 'next/link';
import { PepeAjolote } from '@/components/pepe-ajolote';
import { redirect } from 'next/navigation';
import { abrirSesionDocente, esDocente, pinConfigurado, pinCorrecto } from '@/lib/docente';

export const metadata = { title: 'Panel del maestro', robots: { index: false, follow: false } };

async function entrar(formData: FormData) {
  'use server';
  const pin = String(formData.get('pin') ?? '');
  if (!pinCorrecto(pin)) redirect('/docente/entrar?error=1');
  await abrirSesionDocente();
  redirect('/docente');
}

export default async function Entrar({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await esDocente()) redirect('/docente');
  const { error } = await searchParams;

  return (
    <main id="contenido" className="mx-auto grid min-h-dvh w-full max-w-5xl items-center gap-6 px-4 py-10 md:grid-cols-2">
      <section className="hidden space-y-5 md:block" aria-label="Qué vas a ver">
        <p className="eyebrow text-primary">Diagnóstico de tu grupo</p>
        <h2 className="texto-display text-5xl">Sabe quién entendió de verdad.</h2>
        <ul className="space-y-3">
          {[
            { I: ChartColumn, t: 'La escalera del grupo', d: 'Cuántos alumnos lo resolvieron solos y cuántos necesitaron ayuda.' },
            { I: TriangleAlert, t: 'Quién necesita atención hoy', d: 'Lectura lenta o ayuda máxima, con nombre y motivo.' },
            { I: FileText, t: 'Hojas de práctica', d: 'Listas para imprimir según las brechas del grupo.' },
          ].map(({ I, t, d }) => (
            <li key={t} className="tarjeta-clay flex gap-3 p-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <I className="size-5" aria-hidden />
              </span>
              <span>
                <span className="block font-extrabold">{t}</span>
                <span className="text-sm text-muted-foreground">{d}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
      <div className="tarjeta-clay mx-auto w-full max-w-md space-y-6 p-6 animate-in slide-in-from-bottom-4 fill-mode-both duration-500 motion-reduce:animate-none">
      <div className="flex items-center gap-4">
        <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-ajolote/35">
          <PepeAjolote vivo className="w-14" />
        </span>
        <div>
          <p className="eyebrow text-primary">Para maestros</p>
          <h1 className="texto-titulo text-2xl">Panel del maestro</h1>
        </div>
      </div>
      <p className="text-muted-foreground">Escribe el PIN para ver quién necesita ayuda y en qué se atora tu grupo.</p>
      {pinConfigurado() ? (
        <form action={entrar} className="space-y-3">
          <label htmlFor="pin" className="flex items-center gap-2 font-extrabold">
            <LockKeyhole className="size-4 text-primary" aria-hidden /> PIN
          </label>
          <CampoPin conError={Boolean(error)} />
          {error && (
            <p id="error-pin" className="text-sm font-semibold text-peligro" role="alert">
              Ese PIN no es correcto.
            </p>
          )}
          <button type="submit" className="min-h-12 w-full cursor-pointer rounded-2xl bg-primary font-extrabold text-primary-foreground shadow-boton transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40">
            Entrar
          </button>
        </form>
      ) : (
        <p className="rounded-xl bg-aviso/20 p-4 text-sm" role="alert">
          Falta configurar <code>DOCENTE_PIN</code> en las variables de entorno.
        </p>
      )}
      <Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-xl text-sm font-bold text-muted-foreground hover:text-primary">
        <ArrowLeft className="size-4" aria-hidden /> Volver al inicio
      </Link>
      </div>
    </main>
  );
}
