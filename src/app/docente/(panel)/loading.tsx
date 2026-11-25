import { Esqueleto } from '@/components/esqueleto';

/** Mientras se calculan los datos del grupo: la forma real del panel. */
export default function CargandoPanel() {
  return (
    <div className="space-y-6" role="status" aria-label="Cargando el panel del grupo">
      <div className="space-y-2">
        <Esqueleto className="h-3 w-20" />
        <Esqueleto className="h-9 w-48" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="tarjeta-clay space-y-3 p-4">
            <Esqueleto className="h-3 w-24" />
            <Esqueleto className="h-9 w-16" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Esqueleto className="h-64 rounded-3xl" />
        <Esqueleto className="h-64 rounded-3xl" />
      </div>
      <Esqueleto className="h-80 rounded-3xl" />
      <span className="sr-only">Cargando…</span>
    </div>
  );
}
