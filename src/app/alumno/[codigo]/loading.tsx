import { Esqueleto } from '@/components/esqueleto';
import { PepeAjolote } from '@/components/pepe-ajolote';

/** Mientras carga la conversación: la forma real del chat. */
export default function CargandoChat() {
  return (
    <div className="flex h-dvh flex-col" role="status" aria-label="Cargando tu conversación con Pepe">
      <div className="px-3 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <div className="tarjeta-clay mx-auto flex max-w-2xl items-center gap-3 rounded-3xl p-2">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-ajolote/35">
            <PepeAjolote vivo cara="pensando" className="w-11" />
          </span>
          <div className="flex-1 space-y-2">
            <Esqueleto className="h-4 w-20" />
            <Esqueleto className="h-3 w-32" />
          </div>
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-3 px-3 py-6">
        <Esqueleto className="h-12 w-2/3" />
        <Esqueleto className="h-20 w-3/4" />
        <Esqueleto className="h-10 w-1/3 self-end bg-primary/25" />
        <Esqueleto className="h-14 w-2/3" />
      </div>
      <div className="px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Esqueleto className="mx-auto h-14 max-w-2xl rounded-3xl" />
      </div>
      <span className="sr-only">Cargando…</span>
    </div>
  );
}
