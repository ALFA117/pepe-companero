'use client';

import { RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';
import { PepeAjolote } from '@/components/pepe-ajolote';

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="contenido" className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-4 py-10">
      <div className="tarjeta-clay flex w-full flex-col items-center gap-3 p-6 text-center" role="alert">
        <PepeAjolote vivo cara="pensando" className="w-28" />
        <h1 className="texto-titulo text-2xl">Uy, algo se trabó</h1>
        <p className="text-muted-foreground">
          Puede ser tu internet o que el servidor tardó en contestar. Intenta otra vez; si sigue pasando, avísale a tu profe.
        </p>
        <div className="mt-2 flex w-full flex-col gap-2 min-[380px]:flex-row">
          <button
            type="button"
            onClick={() => retry()}
            className="inline-flex min-h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-primary px-5 font-extrabold text-primary-foreground shadow-boton focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40"
          >
            <RotateCcw className="size-4" aria-hidden /> Reintentar
          </button>
          <Link
            href="/"
            className="inline-flex min-h-12 flex-1 items-center justify-center rounded-2xl border-2 border-border bg-card px-5 font-extrabold shadow-clay focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40"
          >
            Ir al inicio
          </Link>
        </div>
      </div>
    </main>
  );
}
