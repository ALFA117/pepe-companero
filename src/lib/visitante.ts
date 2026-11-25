/**
 * "Probar sin código": crea un alumno visitante en su propio grupo para que
 * cualquiera (por ejemplo, el jurado) pueda platicar con Pepe sin pedirle un
 * código a un maestro. Los visitantes no se mezclan con los grupos reales.
 */
import { randomInt } from 'node:crypto';
import { CodigoOcupadoError, type Alumno, type Grupo, type Repositorio } from '@/db/repositorio';

export const GRUPO_VISITANTES: Grupo = {
  id: '00000000-0000-4000-8000-0000000000f1',
  nombre: 'Visitantes (prueba)',
  escuela: 'Personas que prueban a Pepe desde el inicio',
  docente_nombre: null,
  es_demo: true,
};

/** Sin 0/O ni 1/I/L para que se pueda dictar sin confusiones. */
const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generarCodigoVisitante(azar: (max: number) => number = randomInt): string {
  let sufijo = '';
  for (let i = 0; i < 5; i++) sufijo += ALFABETO[azar(ALFABETO.length)];
  return `PEPE-VIS-${sufijo}`;
}

export async function crearVisitante(repo: Repositorio, azar?: (max: number) => number): Promise<Alumno> {
  for (let intento = 0; intento < 5; intento++) {
    try {
      return await repo.crearAlumno(GRUPO_VISITANTES, { nombre: 'Visitante', codigo: generarCodigoVisitante(azar) });
    } catch (err) {
      if (!(err instanceof CodigoOcupadoError)) throw err;
    }
  }
  throw new Error('No se pudo generar un código de visitante libre');
}
