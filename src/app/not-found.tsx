import Link from 'next/link';
import { PepeAjolote } from '@/components/pepe-ajolote';

export const metadata = { title: 'Página no encontrada', robots: { index: false } };

export default function NoEncontrada() {
  return (
    <main id="contenido" className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-4 py-10">
      <div className="tarjeta-clay flex w-full flex-col items-center gap-3 p-6 text-center">
        <PepeAjolote vivo cara="pensando" className="w-28" />
        <p className="font-mono text-sm font-bold text-primary">Error 404</p>
        <h1 className="texto-titulo text-2xl">Esta página se fue nadando</h1>
        <p className="text-muted-foreground">No existe o cambió de lugar. Regresa al inicio y entra con tu código.</p>
        <Link
          href="/"
          className="mt-2 inline-flex min-h-12 items-center rounded-2xl bg-primary px-5 font-extrabold text-primary-foreground shadow-boton focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40"
        >
          Ir al inicio
        </Link>
      </div>
    </main>
  );
}
