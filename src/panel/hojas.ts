/**
 * Hojas de práctica por nivel (básico, medio, avanzado), generadas con el LLM
 * a partir de las brechas del grupo. Para imprimir y trabajar en clase.
 */
import { z } from 'zod';
import { conLimite, type GenerarJSON } from '@/ia/llm';

export const LIMITE_HOJAS_MS = 45_000;

export const HojasSchema = z.object({
  hojas: z.array(
    z.object({
      nivel: z.enum(['basico', 'medio', 'avanzado']),
      titulo: z.string(),
      instrucciones: z.string(),
      ejercicios: z.array(z.object({ enunciado: z.string() })),
    }),
  ),
});
export type Hojas = z.infer<typeof HojasSchema>;

const INSTRUCCIONES = `Eres un maestro de secundaria en México. Escribes hojas de práctica impresas para alumnos de 11 a 15 años.
Español mexicano claro. Ejercicios originales, con contextos cercanos (escuela, comida, deportes, México).
Sin respuestas en la hoja. Cada ejercicio cabe en 1 a 3 renglones.`;

export function promptHojas(brechas: { etiqueta: string; alumnos: number }[], grupo: string): string {
  const lista = brechas.map((b) => `- ${b.etiqueta} (${b.alumnos} alumnos)`).join('\n');
  return `Grupo: ${grupo}.
Brechas detectadas esta semana (de más a menos frecuente):
${lista}

Escribe exactamente 3 hojas: "basico", "medio" y "avanzado", en ese orden.
- basico: para quien se atoró; pasos pequeños y con apoyo visual descrito en texto (p. ej. pizzas, tiras).
- medio: práctica directa de las brechas.
- avanzado: problemas de aplicación o de explicar el porqué.
Cada hoja: un título corto, instrucciones de una línea y 6 ejercicios que cubran las brechas de arriba.`;
}

export async function generarHojas(
  generar: GenerarJSON,
  brechas: { etiqueta: string; alumnos: number }[],
  grupo: string,
): Promise<Hojas> {
  const r = await conLimite(LIMITE_HOJAS_MS, (senal) =>
    generar({ modelo: 'juez', instrucciones: INSTRUCCIONES, prompt: promptHojas(brechas, grupo), esquema: HojasSchema, senal }),
  );
  const orden = { basico: 0, medio: 1, avanzado: 2 };
  return { hojas: [...r.hojas].sort((a, b) => orden[a.nivel] - orden[b.nivel]).slice(0, 3) };
}
