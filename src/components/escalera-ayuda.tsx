'use client';

/**
 * La escalera de ayuda (niveles 0 a 4) explicada con pestañas. El indicador se
 * desliza con CSS y el contenido cambia con crossfade. Usa el mismo
 * ejemplo de decimales del mini reto, no un reto del banco.
 */
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { PepeAjolote } from './pepe-ajolote';

const NIVELES = [
  {
    nombre: 'Solo',
    titulo: 'Lo resolvió sin ayuda',
    pepe: '0.5 + 0.25 = 0.30 😎 ¿Me la va a calificar bien?',
    maestro: 'Domina el tema.',
  },
  {
    nombre: 'Acotar',
    titulo: 'Elige dónde está el error',
    pepe: 'Hice dos cosas: A) sumé los números después del punto, B) puse el punto al final. ¿Cuál está chueca?',
    maestro: 'Sabe, pero le cuesta ubicar el error.',
  },
  {
    nombre: 'Sentido común',
    titulo: 'Nota que el resultado es absurdo',
    pepe: 'Si tengo medio peso y me dan 25 centavos más, ¿tengo más o menos que medio peso?',
    maestro: 'Necesita conectar con algo concreto.',
  },
  {
    nombre: 'Juntos',
    titulo: 'Aprenden con un ejemplo parecido',
    pepe: 'Probemos 0.2 + 0.3: 20 centavos más 30 centavos son 50. ¿Y 0.5 cuántos centavos son?',
    maestro: 'Necesitó un ejemplo guiado.',
  },
  {
    nombre: 'Repaso',
    titulo: 'Repasa el tema previo',
    pepe: 'Reto rapidito antes: ¿0.5 y 0.50 valen lo mismo?',
    maestro: 'Le falta un tema anterior: repasarlo en clase.',
  },
];

export function EscaleraAyuda() {
  const [nivel, setNivel] = useState(0);
  const n = NIVELES[nivel]!;

  return (
    <div className="tarjeta-clay space-y-5 p-5 sm:p-6">
      <div className="relative grid grid-cols-5 gap-1 rounded-2xl bg-muted/80 p-1" role="tablist" aria-label="Niveles de ayuda">
        {/* Indicador calculado con CSS (columnas iguales): no depende de medir el layout,
            así no se desfasa si la sección todavía está entrando o se está desplazando. */}
        <span
          aria-hidden
          className="pointer-events-none absolute top-1 bottom-1 left-1 rounded-xl bg-primary shadow-clay transition-transform duration-300 ease-out motion-reduce:transition-none"
          style={{ width: 'calc((100% - 1.5rem) / 5)', transform: `translateX(calc(${nivel} * (100% + 0.25rem)))` }}
        />
        {NIVELES.map((x, i) => (
          <button
            key={x.nombre}
            type="button"
            role="tab"
            id={`nivel-tab-${i}`}
            aria-selected={nivel === i}
            aria-controls="nivel-panel"
            onClick={() => setNivel(i)}
            className={`relative min-h-14 min-w-0 cursor-pointer rounded-xl px-1 py-1.5 font-extrabold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              nivel === i ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="relative flex flex-col items-center gap-0.5 leading-tight">
              <span className="font-mono text-base">{i}</span>
              <span className="hidden text-xs text-balance min-[360px]:block">{x.nombre}</span>
            </span>
          </button>
        ))}
      </div>

      <div id="nivel-panel" role="tabpanel" aria-labelledby={`nivel-tab-${nivel}`} className="min-h-[11rem]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={nivel}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12, transition: { duration: 0.12 } }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="space-y-4"
          >
            <div>
              <p className="eyebrow text-primary">Nivel {nivel} · {n.nombre}</p>
              <h3 className="texto-titulo text-xl">{n.titulo}</h3>
            </div>
            <div className="flex items-end gap-2">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-ajolote/35" aria-hidden>
                <PepeAjolote className="w-9" cara={nivel >= 3 ? 'pensando' : 'feliz'} />
              </span>
              <p className="rounded-3xl rounded-bl-md border-2 border-burbuja-pepe-borde bg-burbuja-pepe px-4 py-2.5 text-[15px] shadow-clay">
                {n.pepe}
              </p>
            </div>
            <p className="flex items-start gap-2 text-sm">
              <span className="shrink-0 rounded-full bg-trajinera/40 px-2.5 py-0.5 text-xs font-extrabold whitespace-nowrap text-foreground">El maestro ve</span>
              <span className="text-muted-foreground">{n.maestro}</span>
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
