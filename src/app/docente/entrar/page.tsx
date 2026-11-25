import { ArrowLeft, LockKeyhole } from 'lucide-react';
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
    <main id="contenido" className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10">
      <div className="tarjeta-clay space-y-6 p-6 animate-in slide-in-from-bottom-4 fill-mode-both duration-500 motion-reduce:animate-none">
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
          <input
            id="pin"
            name="pin"
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            required
            autoFocus
            className="min-h-12 w-full rounded-2xl border-2 border-input bg-background/80 px-4 font-mono text-[18px] tracking-[0.4em] outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-ring/25 aria-[describedby]:border-peligro"
            aria-describedby={error ? 'error-pin' : undefined}
          />
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
