/**
 * Conversación con Pepe en la terminal, contra el motor real y el LLM real
 * (si hay llaves), con la base en memoria.
 *
 *   pnpm simular                          # empieza con el reto de matemáticas
 *   pnpm simular --reto lectura-inferencia-causal-ajolote-01
 *   pnpm simular --audio ruta/nota.m4a    # en un reto de lectura, manda ese audio como la nota de voz
 *
 * Escribe tus respuestas; "/salir" para terminar. También acepta las
 * respuestas por stdin (una por línea) para correr un guion.
 */
import { readFile } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
import { RepositorioMemoria } from '../src/db/memoria';
import { generarJSON } from '../src/ia/modelos';
import { transcribirConGroq } from '../src/ia/transcribir';
import { env, hayLLM, hayTranscripcion } from '../src/lib/env';
import { procesar, type DependenciasMotor } from '../src/motor/procesar';
import { listarRetos, obtenerReto } from '../src/retos/cargar';

try {
  process.loadEnvFile('.env.local');
} catch {
  // Sin .env.local: el motor usa sus respaldos.
}

const args = process.argv.slice(2);
const opcion = (nombre: string) => {
  const i = args.indexOf(nombre);
  return i >= 0 ? args[i + 1] : undefined;
};

const ALUMNO = '00000000-0000-0000-0000-000000000101';
const gris = (t: string) => `\x1b[90m${t}\x1b[0m`;
const verde = (t: string) => `\x1b[32m${t}\x1b[0m`;

async function main() {
  const repo = new RepositorioMemoria();
  const deps: DependenciasMotor = {
    repo,
    generar: hayLLM()
      ? generarJSON
      : async () => {
          throw new Error('sin llaves de LLM');
        },
    transcribir: hayTranscripcion() ? transcribirConGroq : undefined,
    banco: listarRetos(),
  };

  const retoId = opcion('--reto');
  if (retoId) {
    const reto = obtenerReto(retoId);
    await repo.insertarSesion({
      id: crypto.randomUUID(),
      alumno_id: ALUMNO,
      reto_id: reto.id,
      canal: 'web',
      fase: 'pendiente',
      nivel: 0,
      paso: 0,
      nivel_max: 0,
      pidio_justificacion: false,
      insistio_lectura: false,
      contador_pide_respuesta: 0,
      requiere_docente: false,
      siguiente_reto_id: null,
      version: 0,
    });
  }

  const e = env();
  console.log(gris(`LLM: ${hayLLM() ? `Pepe=${e.MODEL_PEPE} · Juez=${e.MODEL_JUEZ}` : 'sin llaves (respaldos)'}`));
  console.log(gris(`Voz: ${hayTranscripcion() ? e.MODEL_STT : 'sin transcripción'} · escribe /salir para terminar\n`));

  const mostrar = (r: Awaited<ReturnType<typeof procesar>>, ms: number) => {
    for (const m of r.mensajes) console.log(verde(`Pepe: ${m.replace(/\n/g, '\n      ')}`));
    if (r.botones) console.log(verde(`      [${r.botones.join('] [')}]`));
    const d = r.detalle;
    const s = r.sesion;
    console.log(
      gris(
        `  ↳ ${d?.clasificacion ? `juez=${d.clasificacion} (${d.origen_juez}) · ` : ''}acción=${d?.accion} · pepe=${d?.origen_pepe} · ` +
          `fase=${s?.fase} nivel=${s?.nivel} paso=${s?.paso} · ${ms} ms` +
          (d?.transcripcion ? `\n  ↳ transcripción: "${d.transcripcion}"` : ''),
      ),
    );
  };

  const enviar = async (entrada: Parameters<typeof procesar>[1]['entrada']) => {
    const t0 = Date.now();
    const r = await procesar(deps, { alumno_id: ALUMNO, canal: 'web', entrada });
    mostrar(r, Date.now() - t0);
    return r;
  };

  let r = await enviar({ tipo: 'texto', texto: 'hola' });

  const rutaAudio = opcion('--audio');
  if (rutaAudio && r.sesion?.fase === 'leyendo_texto') {
    const datos = await readFile(rutaAudio);
    console.log(gris(`Tú: [nota de voz ${rutaAudio}]`));
    r = await enviar({ tipo: 'audio', audio: datos.buffer.slice(datos.byteOffset, datos.byteOffset + datos.byteLength) as ArrayBuffer, mime: 'audio/mp4' });
    const f = repo.datos.fluidez[0];
    if (f) console.log(gris(`  ↳ fluidez: ${JSON.stringify(f)}`));
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: process.stdin.isTTY });
  const interactivo = process.stdin.isTTY;
  for await (const linea of interactivo ? leerInteractivo(rl) : rl) {
    const t = linea.trim();
    if (!t) continue;
    if (t === '/salir') break;
    if (!interactivo) console.log(`Tú: ${t}`);
    r = await enviar({ tipo: 'texto', texto: t });
    if (r.sesion?.fase === 'terminado') {
      const final = repo.datos.evaluaciones_finales.at(-1);
      if (final) console.log(gris(`  ↳ evaluación final: ${JSON.stringify(final)}`));
    }
  }
  rl.close();
}

async function* leerInteractivo(rl: ReturnType<typeof createInterface>) {
  while (true) yield await rl.question('Tú: ');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
