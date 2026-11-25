import { FileText, LogOut, Users } from 'lucide-react';
import { PepeAjolote } from '@/components/pepe-ajolote';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { cerrarSesionDocente, exigirDocente } from '@/lib/docente';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };

async function salir() {
  'use server';
  await cerrarSesionDocente();
  redirect('/docente/entrar');
}

export default async function LayoutPanel({ children }: { children: ReactNode }) {
  await exigirDocente();
  return (
    <div className="min-h-dvh print:bg-white">
      <header className="sticky top-0 z-20 px-3 pt-3 print:hidden">
        <div className="tarjeta-clay mx-auto flex max-w-6xl items-center gap-2 rounded-3xl px-3 py-2">
          <Link href="/docente" className="flex min-h-11 items-center gap-2 rounded-2xl pr-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <span className="flex size-10 items-center justify-center rounded-xl bg-ajolote/35">
              <PepeAjolote className="w-9" />
            </span>
            <span className="leading-tight">
              <span className="texto-titulo block text-lg">Pepe</span>
              <span className="hidden text-xs text-muted-foreground sm:block">Panel del maestro</span>
            </span>
          </Link>
          <nav className="ml-auto flex items-center gap-1 text-sm font-bold" aria-label="Panel">
            <Link href="/docente" className="flex min-h-11 items-center gap-2 rounded-xl px-3 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Users className="size-4" aria-hidden /> <span className="hidden sm:inline">Grupo</span>
            </Link>
            <Link href="/docente/hojas" className="flex min-h-11 items-center gap-2 rounded-xl px-3 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <FileText className="size-4" aria-hidden /> <span className="hidden sm:inline">Hojas de práctica</span>
              <span className="sr-only sm:hidden">Hojas de práctica</span>
            </Link>
            <form action={salir}>
              <button type="submit" aria-label="Salir" className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-3 text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <LogOut className="size-4" aria-hidden /> <span className="hidden sm:inline">Salir</span>
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main id="contenido" className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
