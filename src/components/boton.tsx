'use client';

/**
 * Botón base de Pepe: estilo "clay" (relieve suave), press con spring y
 * estado de carga. Mínimo 44 px de alto.
 */
import { motion, useReducedMotion, type HTMLMotionProps } from 'motion/react';
import { LoaderCircle } from 'lucide-react';
import type { ReactNode } from 'react';

type Variante = 'primario' | 'secundario' | 'fantasma';

const ESTILOS: Record<Variante, string> = {
  primario: 'bg-primary text-primary-foreground shadow-boton',
  secundario: 'bg-card text-foreground border border-border shadow-clay',
  fantasma: 'text-primary hover:bg-primary/10',
};

interface Props extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variante?: Variante;
  cargando?: boolean;
  children: ReactNode;
}

export function Boton({ variante = 'primario', cargando = false, className, disabled, children, ...resto }: Props) {
  const reduce = useReducedMotion();
  const inactivo = disabled || cargando;
  return (
    <motion.button
      whileHover={reduce || inactivo ? undefined : { scale: 1.03 }}
      whileTap={reduce || inactivo ? undefined : { scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      disabled={inactivo}
      aria-busy={cargando || undefined}
      className={`inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl px-5 font-extrabold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-55 ${ESTILOS[variante]} ${className ?? ''}`}
      {...resto}
    >
      {cargando && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
      {children}
    </motion.button>
  );
}
