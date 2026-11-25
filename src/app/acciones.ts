'use server';

import { repositorio } from '@/motor/servidor';
import { crearVisitante } from '@/lib/visitante';

/** Crea un alumno visitante y devuelve su código para entrar al chat. */
export async function probarSinCodigo(): Promise<{ codigo: string } | { error: string }> {
  try {
    const alumno = await crearVisitante(repositorio());
    return { codigo: alumno.codigo };
  } catch (err) {
    console.error('[visitante]', err instanceof Error ? err.message : err);
    return { error: 'No pude crear tu acceso de prueba. Intenta otra vez en un momento.' };
  }
}
