import { redirect } from 'next/navigation';
import { abrirSesionDocente, esDocente, pinConfigurado, pinCorrecto } from '@/lib/docente';

export const metadata = { title: 'Panel del maestro · Pepe' };

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
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 px-4">
      <div className="space-y-2">
        <p className="text-4xl" aria-hidden>
          🦎
        </p>
        <h1 className="text-2xl font-bold">Panel del maestro</h1>
        <p className="text-muted-foreground">Escribe el PIN para ver cómo va tu grupo.</p>
      </div>
      {pinConfigurado() ? (
        <form action={entrar} className="space-y-3">
          <label htmlFor="pin" className="block font-medium">
            PIN
          </label>
          <input
            id="pin"
            name="pin"
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            required
            autoFocus
            className="min-h-12 w-full rounded-xl border border-input bg-background px-4 text-[16px] tracking-widest outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-describedby={error ? 'error-pin' : undefined}
          />
          {error && (
            <p id="error-pin" className="text-sm text-peligro" role="alert">
              Ese PIN no es correcto.
            </p>
          )}
          <button type="submit" className="min-h-12 w-full rounded-xl bg-primary font-semibold text-primary-foreground">
            Entrar
          </button>
        </form>
      ) : (
        <p className="rounded-xl bg-aviso/20 p-4 text-sm">
          Falta configurar <code>DOCENTE_PIN</code> en las variables de entorno.
        </p>
      )}
    </main>
  );
}
