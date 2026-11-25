/** Bloque gris que late mientras carga (sin animación con movimiento reducido). */
export function Esqueleto({ className }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-2xl bg-muted motion-reduce:animate-none ${className ?? ''}`} />;
}
