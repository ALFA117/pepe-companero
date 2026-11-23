/**
 * Filtro anti-respuesta (sección 6.4 del brief): revisa lo que Pepe va a
 * mandar contra `prohibido_para_pepe`, con comparación normalizada. En
 * `cierre` y `terminado` no aplica, porque el alumno ya resolvió.
 */
import { frasesProhibidasEn } from '@/lib/texto';
import type { Fase, SalidaPepe } from './tipos';

const FASES_SIN_FILTRO: readonly Fase[] = ['cierre', 'terminado'];

export interface ResultadoFiltro {
  limpio: boolean;
  /** Frases prohibidas encontradas (vacío si está limpio). */
  encontradas: string[];
}

export function revisarSalida(
  salida: SalidaPepe,
  prohibidas: readonly string[],
  fase: Fase,
): ResultadoFiltro {
  if (FASES_SIN_FILTRO.includes(fase)) return { limpio: true, encontradas: [] };
  const textos = [...salida.mensajes, ...(salida.botones ?? [])];
  const encontradas = [...new Set(textos.flatMap((t) => frasesProhibidasEn(t, prohibidas)))];
  return { limpio: encontradas.length === 0, encontradas };
}
