import { PepeAjolote } from '@/components/pepe-ajolote';

/** Mientras se generan las hojas (unos 20 s). */
export default function CargandoHojas() {
  return (
    <div className="tarjeta-clay mx-auto flex max-w-md flex-col items-center gap-4 p-8 text-center" role="status">
      <span className="pepe-flota flex size-28 items-center justify-center rounded-3xl bg-ajolote/35">
        <PepeAjolote vivo cara="pensando" className="w-24" />
      </span>
      <p className="texto-titulo text-xl">Pepe está armando las hojas…</p>
      <p className="text-sm text-muted-foreground">Tres niveles según las brechas de tu grupo. Tarda unos 20 segundos.</p>
      <div className="flex gap-1.5" aria-hidden>
        <span className="punto-escribiendo size-2.5 rounded-full bg-ajolote-branquia" />
        <span className="punto-escribiendo size-2.5 rounded-full bg-ajolote-branquia" />
        <span className="punto-escribiendo size-2.5 rounded-full bg-ajolote-branquia" />
      </div>
    </div>
  );
}
