'use client';

/**
 * Aviso flotante que se cierra solo. Para errores que no son parte de la
 * conversación (permiso del micrófono, sin internet…).
 */
import { AnimatePresence, motion } from 'motion/react';
import { CircleAlert, X } from 'lucide-react';
import { useEffect } from 'react';

export function Toast({ mensaje, alCerrar, duracionMs = 5000 }: { mensaje: string | null; alCerrar: () => void; duracionMs?: number }) {
  useEffect(() => {
    if (!mensaje) return;
    const t = setTimeout(alCerrar, duracionMs);
    return () => clearTimeout(t);
  }, [mensaje, alCerrar, duracionMs]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-50 flex justify-center px-3">
      <AnimatePresence>
        {mensaje && (
          <motion.div
            key={mensaje}
            role="alert"
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, transition: { duration: 0.15 } }}
            transition={{ type: 'spring', stiffness: 360, damping: 26 }}
            className="tarjeta-clay pointer-events-auto flex max-w-md items-start gap-3 border-peligro/40 py-3 pr-2 pl-4"
          >
            <CircleAlert className="mt-0.5 size-5 shrink-0 text-peligro" aria-hidden />
            <p className="flex-1 text-[15px]">{mensaje}</p>
            <button
              type="button"
              onClick={alCerrar}
              aria-label="Cerrar aviso"
              className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-xl text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-4" aria-hidden />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
