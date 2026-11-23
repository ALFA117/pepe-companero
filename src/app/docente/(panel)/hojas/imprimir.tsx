'use client';

export function BotonImprimir() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="min-h-11 rounded-lg border border-border bg-background px-4 text-sm font-medium"
    >
      Imprimir
    </button>
  );
}
