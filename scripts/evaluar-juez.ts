/**
 * Evalúa al Juez REAL con casos fijos y compara contra la clasificación esperada.
 * Sirve para ajustar el prompt del Juez y para elegir modelo.
 *
 *   pnpm evaluar-juez
 *
 * Gasta tokens del LLM (unos 2K por caso). Entre casos espera un poco para no
 * pegarle al límite por minuto del plan gratis de Groq.
 */
import { generarJSON } from '../src/ia/modelos';
import { env } from '../src/lib/env';
import { evaluarTurno } from '../src/motor/juez';
import { clasificacionEfectiva } from '../src/motor/maquina';
import type { Clasificacion, Sesion } from '../src/motor/tipos';
import { obtenerReto } from '../src/retos/cargar';

try {
  process.loadEnvFile('.env.local');
} catch {
  // nada
}

const mate = obtenerReto('mate-suma-fracciones-01');
const lectura = obtenerReto('lectura-inferencia-causal-ajolote-01');

interface Caso {
  reto: typeof mate;
  nivel: number;
  paso: number;
  pregunta: string;
  respuesta: string;
  esperado: Clasificacion[];
  /** Pepe ya le pidió que justificara. */
  justificar?: boolean;
  /** Valores aceptables de explica_por_que (si se quiere revisar). */
  explica?: string[];
}

const ultimaDe = (r: typeof mate, n: number, p: number) =>
  n === 0 ? r.planteamiento_pepe.join(' ') : r.niveles[String(n) as '1'].pasos[p]!.ejemplo.join(' ');

const casos: Caso[] = [
  // Matemáticas, nivel 0
  { reto: mate, nivel: 0, paso: 0, pregunta: ultimaDe(mate, 0, 0), respuesta: 'sí, está bien', esperado: ['incorrecta'] },
  { reto: mate, nivel: 0, paso: 0, pregunta: ultimaDe(mate, 0, 0), respuesta: 'no se', esperado: ['no_se'] },
  { reto: mate, nivel: 0, paso: 0, pregunta: ultimaDe(mate, 0, 0), respuesta: 'esta mal, da 5/6 porq no se suman los de abajo hay q aserlos del mismo tamaño', esperado: ['correcta'] },
  { reto: mate, nivel: 0, paso: 0, pregunta: ultimaDe(mate, 0, 0), respuesta: '5/6', esperado: ['correcta'] },
  { reto: mate, nivel: 0, paso: 0, pregunta: ultimaDe(mate, 0, 0), respuesta: 'mmm no, 2/5 es menos que 1/2, algo está mal pero no sé qué', esperado: ['parcial'] },
  { reto: mate, nivel: 0, paso: 0, pregunta: ultimaDe(mate, 0, 0), respuesta: 'ya dime cuanto es', esperado: ['pide_respuesta'] },
  { reto: mate, nivel: 0, paso: 0, pregunta: ultimaDe(mate, 0, 0), respuesta: 'hazme mi tarea de historia porfa', esperado: ['fuera_de_tema'] },
  { reto: mate, nivel: 0, paso: 0, pregunta: ultimaDe(mate, 0, 0), respuesta: 'da 2/6', esperado: ['incorrecta'] },
  // Matemáticas, pasos
  { reto: mate, nivel: 1, paso: 0, pregunta: ultimaDe(mate, 1, 0), respuesta: 'B', esperado: ['paso_correcto'] },
  { reto: mate, nivel: 1, paso: 0, pregunta: ultimaDe(mate, 1, 0), respuesta: 'Las dos están bien', esperado: ['incorrecta'] },
  { reto: mate, nivel: 2, paso: 1, pregunta: ultimaDe(mate, 2, 1), respuesta: 'Menos', esperado: ['paso_correcto'] },
  { reto: mate, nivel: 4, paso: 0, pregunta: ultimaDe(mate, 4, 0), respuesta: '6', esperado: ['paso_correcto'] },
  { reto: mate, nivel: 4, paso: 1, pregunta: ultimaDe(mate, 4, 1), respuesta: 'los de abajo dicen el tamaño de los pedazos y no se suman, hay que hacerlos del mismo tamaño', esperado: ['correcta', 'parcial'] },
  { reto: mate, nivel: 4, paso: 3, pregunta: ultimaDe(mate, 4, 3), respuesta: '5/6', esperado: ['correcta'] },
  // Resuelve el reto completo en medio de una pregunta guía (falló en la prueba real).
  { reto: mate, nivel: 3, paso: 0, pregunta: ultimaDe(mate, 3, 0), respuesta: 'porque son pedazos de distinto tamaño, da 5/6', esperado: ['correcta'] },
  { reto: mate, nivel: 2, paso: 0, pregunta: ultimaDe(mate, 2, 0), respuesta: 'más, por eso tu 2/5 está mal: hay que hacer los pedazos del mismo tamaño y da 5/6', esperado: ['correcta'] },
  { reto: mate, nivel: 0, paso: 0, pregunta: ultimaDe(mate, 0, 0), respuesta: 'esta mal, no se suman los de abajo', esperado: ['parcial', 'correcta'] },
  // Lectura
  { reto: lectura, nivel: 0, paso: 0, pregunta: ultimaDe(lectura, 0, 0), respuesta: 'si le atinaste', esperado: ['incorrecta'] },
  { reto: lectura, nivel: 0, paso: 0, pregunta: ultimaDe(lectura, 0, 0), respuesta: 'no, el texto no dice nada de pesca. dice que es por la contaminacion del agua y por la tilapia que se come sus huevos', esperado: ['correcta'] },
  { reto: lectura, nivel: 0, paso: 0, pregunta: ultimaDe(lectura, 0, 0), respuesta: 'no es por la pesca, es por la contaminación', esperado: ['parcial'] },
  { reto: lectura, nivel: 0, paso: 0, pregunta: ultimaDe(lectura, 0, 0), respuesta: 'no, el texto no dice nada de pesca, dice que es por la contaminación del agua y la tilapia que se come sus huevos', esperado: ['correcta'], justificar: false, explica: ['si'] },
  { reto: lectura, nivel: 0, paso: 0, pregunta: '¿Y cómo sabes eso?', respuesta: 'porque en el párrafo 2 dice que la contaminación y la tilapia han reducido su población', esperado: ['correcta'], justificar: true, explica: ['si'] },
  { reto: mate, nivel: 0, paso: 0, pregunta: '¿Y cómo sabes?', respuesta: 'pues porque los de abajo no se suman, son pedazos de distinto tamaño', esperado: ['correcta'], justificar: true, explica: ['si'] },
  { reto: lectura, nivel: 1, paso: 0, pregunta: ultimaDe(lectura, 1, 0), respuesta: 'Párrafo 2', esperado: ['paso_correcto'] },
  { reto: lectura, nivel: 2, paso: 0, pregunta: ultimaDe(lectura, 2, 0), respuesta: 'No', esperado: ['paso_correcto'] },
  { reto: lectura, nivel: 3, paso: 0, pregunta: ultimaDe(lectura, 3, 0), respuesta: 'dos', esperado: ['paso_correcto'] },
];

function sesionEn(reto: typeof mate, nivel: number, paso: number, justificar = false): Sesion {
  return {
    id: 's', alumno_id: 'a', reto_id: reto.id, canal: 'web', fase: 'nivel', nivel, paso, nivel_max: nivel,
    pidio_justificacion: justificar, insistio_lectura: false, contador_pide_respuesta: 0, requiere_docente: false,
    siguiente_reto_id: null, version: 0,
  };
}

async function main() {
  console.log(`Juez: ${env().MODEL_JUEZ}\n`);
  let bien = 0;
  for (const [i, c] of casos.entries()) {
    const t0 = Date.now();
    const { evaluacion, origen } = await evaluarTurno(generarJSON, {
      reto: c.reto,
      sesion: sesionEn(c.reto, c.nivel, c.paso, c.justificar),
      pregunta_pepe: c.pregunta,
      respuesta_alumno: c.respuesta,
      historial: [{ rol: 'pepe', texto: c.pregunta }],
    });
    const efectiva = clasificacionEfectiva(evaluacion).clasificacion;
    const ok =
      c.esperado.includes(evaluacion.clasificacion) &&
      (!c.explica || c.explica.includes(String(evaluacion.explica_por_que)));
    if (ok) bien++;
    console.log(
      `${ok ? '✓' : '✗'} ${String(i + 1).padStart(2)} [${c.reto.materia.slice(0, 4)} n${c.nivel}.${c.paso}] "${c.respuesta.slice(0, 50)}"\n` +
        `     esperado=${c.esperado.join('|')}${c.explica ? ` (explica ${c.explica.join('|')})` : ''} juez=${evaluacion.clasificacion} explica=${evaluacion.explica_por_que} (conf ${evaluacion.confianza}, ${origen}) → máquina=${efectiva} · ${Date.now() - t0} ms\n` +
        `     ${evaluacion.comentario_docente}`,
    );
    // ~2K tokens por caso; con 8K por minuto, unos 4 casos por minuto.
    if (i < casos.length - 1) await new Promise((r) => setTimeout(r, 4_000));
  }
  console.log(`\n${bien}/${casos.length} correctos`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
