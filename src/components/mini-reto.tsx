'use client';

/**
 * "Pruébalo tú": un mini reto en el inicio para sentir cómo funciona Pepe sin
 * entrar. Es un ejemplo de decimales que NO está en el banco de retos, para no
 * adelantar la respuesta de los retos reales.
 */
import { AnimatePresence, motion } from 'motion/react';
import { MousePointerClick, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { PepeAjolote } from './pepe-ajolote';

type Opcion = { id: string; texto: string; correcta: boolean; respuesta: string };

const OPCIONES: Opcion[] = [
  {
    id: 'a',
    texto: 'Está bien, Pepe',
    correcta: false,
    respuesta: '¡Uy! Piénsale: 0.5 es la mitad. ¿Medio más algo puede dar menos que medio? 🤔',
  },
  {
    id: 'b',
    texto: 'Sumaste como enteros',
    correcta: true,
    respuesta: '¡Me salvaste! 🙌 0.5 es 0.50, había que alinear los decimales. Así funciona: tú me explicas a mí.',
  },
  {
    id: 'c',
    texto: 'Te faltó el punto',
    correcta: false,
    respuesta: 'Mmm, el punto sí lo puse… ¿Qué números sumé? Fíjate en el 5 y el 25. 👀',
  },
];

export function MiniReto() {
  const [elegida, setElegida] = useState<Opcion | null>(null);
  const resuelto = elegida?.correcta === true;

  return (
    <div className="tarjeta-clay grid gap-5 p-5 sm:grid-cols-[auto_1fr] sm:items-center sm:p-6">
      <motion.div
        key={elegida ? (resuelto ? 'feliz' : 'duda') : 'inicio'}
        initial={{ rotate: -6, scale: 0.94 }}
        animate={{ rotate: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 14 }}
        className="mx-auto flex size-28 items-center justify-center rounded-3xl bg-ajolote/35 sm:size-32"
      >
        <PepeAjolote vivo cara={elegida && !resuelto ? 'pensando' : 'feliz'} className="w-24 sm:w-28" />
      </motion.div>

      <div className="min-w-0 space-y-3">
        <div className="rounded-3xl rounded-bl-md border-2 border-burbuja-pepe-borde bg-burbuja-pepe px-4 py-3 shadow-clay">
          <p className="font-mono text-xl font-bold">0.5 + 0.25 = 0.30 😎</p>
          <p className="text-[15px] text-muted-foreground">Sumé 5 + 25 = 30. ¿Me la va a calificar bien?</p>
        </div>

        <p id="mini-reto-instruccion" className="flex items-center gap-1.5 text-[13px] font-bold text-muted-foreground">
          <MousePointerClick className="size-4 text-primary" aria-hidden /> Toca la respuesta que creas correcta
        </p>
        <div className="flex flex-wrap gap-2" role="group" aria-labelledby="mini-reto-instruccion">
          {OPCIONES.map((o) => {
            const activa = elegida?.id === o.id;
            return (
              <motion.button
                key={o.id}
                type="button"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                onClick={() => setElegida(o)}
                disabled={resuelto}
                aria-pressed={activa}
                className={`min-h-11 cursor-pointer rounded-2xl border-2 px-4 text-[15px] font-extrabold shadow-clay transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40 disabled:cursor-default ${
                  activa
                    ? o.correcta
                      ? 'border-exito bg-exito text-white'
                      : 'border-peligro bg-peligro/10 text-peligro'
                    : 'border-primary/40 bg-primary/10 text-foreground hover:border-primary hover:bg-primary hover:text-primary-foreground'
                }`}
              >
                {o.texto}
              </motion.button>
            );
          })}
        </div>

        <div aria-live="polite" className="min-h-[3.5rem]">
          <AnimatePresence mode="wait" initial={false}>
            {elegida ? (
              <motion.div
                key={elegida.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6, transition: { duration: 0.12 } }}
                transition={{ type: 'spring', stiffness: 300, damping: 26 }}
                className="flex flex-wrap items-center gap-2"
              >
                <p className={`text-[15px] font-semibold ${resuelto ? 'text-exito' : 'text-foreground'}`}>
                  <span className="sr-only">{resuelto ? 'Correcto. ' : 'Todavía no. '}</span>
                  {elegida.respuesta}
                </p>
                {resuelto && (
                  <button
                    type="button"
                    onClick={() => setElegida(null)}
                    className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl px-3 text-sm font-bold text-muted-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <RotateCcw className="size-4" aria-hidden /> Otra vez
                  </button>
                )}
              </motion.div>
            ) : (
              <motion.p key="pista" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-muted-foreground">
                Si te equivocas, Pepe te da una pista, nunca la respuesta.
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
