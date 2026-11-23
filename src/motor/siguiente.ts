/**
 * Elección del siguiente reto al terminar una sesión (función pura).
 *
 * Regla del brief:
 *   - resolvió sin ayuda (nivel_max = 0)  → más difícil, mismo concepto
 *   - llegó al nivel 4 / requiere docente → reto del prerrequisito
 *   - en otro caso                        → mismo concepto, misma dificultad
 *
 * Con un banco chico, la regla exacta casi nunca tiene candidato, así que cada
 * caso tiene una lista de respaldos que se prueban en orden. Nunca repite el
 * reto actual ni los de `yaHechos`. Si no queda nada, devuelve null.
 */
import type { Reto } from './tipos';

export interface ResultadoSesion {
  nivel_max: number;
  requiere_docente: boolean;
}

type Filtro = (r: Reto) => boolean;

export function elegirSiguienteReto(
  actual: Reto,
  resultado: ResultadoSesion,
  banco: readonly Reto[],
  yaHechos: readonly string[] = [],
): string | null {
  const excluidos = new Set([actual.id, ...yaHechos]);
  const disponibles = banco
    .filter((r) => !excluidos.has(r.id))
    .sort((a, b) => a.dificultad - b.dificultad || a.id.localeCompare(b.id));

  // Nunca se cambia de materia, aunque dos retos compartan el nombre del concepto.
  const mismaMateria: Filtro = (r) => r.materia === actual.materia;
  const mismoConcepto: Filtro = (r) => mismaMateria(r) && r.concepto === actual.concepto;
  const d = actual.dificultad;

  let preferencias: Filtro[];

  if (resultado.requiere_docente || resultado.nivel_max >= 4) {
    // Bajar un escalón: el prerrequisito primero, si no, algo igual o más fácil.
    const prereq = actual.prerequisito;
    preferencias = [
      (r) => prereq !== null && mismaMateria(r) && r.concepto === prereq,
      (r) => mismoConcepto(r) && r.dificultad < d,
      (r) => mismaMateria(r) && r.dificultad < d,
      (r) => mismoConcepto(r) && r.dificultad === d,
      (r) => mismaMateria(r) && r.dificultad <= d,
    ];
  } else if (resultado.nivel_max === 0) {
    // Subir: más difícil del mismo concepto (el más cercano en dificultad).
    preferencias = [
      (r) => mismoConcepto(r) && r.dificultad > d,
      (r) => mismoConcepto(r) && r.dificultad === d,
      (r) => mismaMateria(r) && r.dificultad > d,
      (r) => mismaMateria(r) && r.dificultad === d,
      mismaMateria,
    ];
  } else {
    // Practicar lo mismo.
    preferencias = [
      (r) => mismoConcepto(r) && r.dificultad === d,
      mismoConcepto,
      (r) => mismaMateria(r) && r.dificultad === d,
      mismaMateria,
    ];
  }

  for (const f of preferencias) {
    const candidato = disponibles.find(f);
    if (candidato) return candidato.id;
  }
  return null;
}
