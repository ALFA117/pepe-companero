import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { cerrarSesionDocente, exigirDocente } from '@/lib/docente';

export const dynamic = 'force-dynamic';

async function salir() {
  'use server';
  await cerrarSesionDocente();
  redirect('/docente/entrar');
}

export default async function LayoutPanel({ children }: { children: ReactNode }) {
  await exigirDocente();
  return (
    <div className="min-h-dvh bg-muted/30 print:bg-white">
      <header className="border-b border-border bg-background print:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link href="/docente" className="flex items-center gap-2 font-semibold">
            <span aria-hidden>🦎</span> Pepe · Panel del maestro
          </Link>
          <nav className="ml-auto flex items-center gap-1 text-sm">
            <Link href="/docente/hojas" className="rounded-md px-3 py-2 hover:bg-muted">
              Hojas de práctica
            </Link>
            <form action={salir}>
              <button type="submit" className="rounded-md px-3 py-2 text-muted-foreground hover:bg-muted">
                Salir
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
