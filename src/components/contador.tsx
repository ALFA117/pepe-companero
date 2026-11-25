'use client';

/**
 * Cifra destacada: el número SIEMPRE es el real (nunca se muestra un valor
 * intermedio que pudiera quedarse congelado). Al aparecer en pantalla hace un
 * "pop" con spring; con movimiento reducido, nada.
 */
import { motion } from 'motion/react';

export function Contador({ valor, decimales = 0, sufijo = '' }: { valor: number; decimales?: number; sufijo?: string }) {
  return (
    <motion.span
      className="inline-block tabular-nums"
      initial={{ scale: 0.82, y: 6 }}
      whileInView={{ scale: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ type: 'spring', stiffness: 260, damping: 14 }}
    >
      {valor.toFixed(decimales)}
      {sufijo}
    </motion.span>
  );
}
