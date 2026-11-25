import { beforeEach, describe, expect, it } from 'vitest';
import { RepositorioMemoria } from '@/db/memoria';
import type { Transcriptor } from '@/ia/transcribir';
import { listarRetos, obtenerReto } from '@/retos/cargar';
import { retoSintetico } from '@/test/fabricas';
import { finalCrudo, juezCrudo, llmFalso, type LLMFalso } from '@/test/llm-falso';
import { palabrasNormalizadas } from './fluidez';
import { elegirRetoInicial, procesar, type DependenciasMotor, type EntradaProcesar } from './procesar';
import type { Sesion } from './tipos';

const mate = obtenerReto('mate-suma-fracciones-01');
const lectura = obtenerReto('lectura-inferencia-causal-ajolote-01');
const ALUMNO = '00000000-0000-0000-0000-000000000101';

/** Pepe que siempre contesta algo limpio y Juez con un guion de clasificaciones. */
function llmConGuion(guion: (string | [string, Record<string, unknown>])[], finales = [finalCrudo()]) {
  let i = 0;
  let f = 0;
  return llmFalso({
    pepe: () => ({ mensajes: ['Mmm, a ver…', '¿Qué piensas?'] }),
    juez: (p) => {
      if (p.prompt.includes('Explicación final del alumno')) return finales[Math.min(f++, finales.length - 1)];
      const paso = guion[i++] ?? 'no_se';
      return Array.isArray(paso) ? juezCrudo(paso[0], paso[1]) : juezCrudo(paso);
    },
  });
}

/** Transcriptor que "lee" el texto del reto palabra por palabra. */
const transcriptorPerfecto: Transcriptor = async () => {
  const palabras = palabrasNormalizadas(lectura.texto!.parrafos.join(' '));
  return {
    texto: palabras.join(' '),
    palabras: palabras.map((palabra, k) => ({ palabra, inicio: k * 0.5, fin: k * 0.5 + 0.4 })),
  };
};

let repo: RepositorioMemoria;
let llm: LLMFalso;
let deps: DependenciasMotor;
let contador: number;

function preparar(l: LLMFalso, extra: Partial<DependenciasMotor> = {}) {
  repo = new RepositorioMemoria();
  llm = l;
  contador = 0;
  deps = { repo, generar: l.generar, banco: listarRetos(), nuevoId: () => `sesion-${++contador}`, ...extra };
}

const texto = (t: string, id?: string): EntradaProcesar => ({
  alumno_id: ALUMNO,
  canal: 'web',
  entrada: { tipo: 'texto', texto: t },
  ...(id ? { mensaje_externo_id: id } : {}),
});
const audio = (): EntradaProcesar => ({
  alumno_id: ALUMNO,
  canal: 'whatsapp',
  entrada: { tipo: 'audio', audio: new ArrayBuffer(8), mime: 'audio/ogg; codecs=opus' },
});

/** Pone al alumno directo en una sesión del reto dado. */
async function empezarEn(retoId: string, fase: Sesion['fase'] = 'nivel') {
  await repo.insertarSesion({
    id: 'sesion-fija',
    alumno_id: ALUMNO,
    reto_id: retoId,
    canal: 'web',
    fase,
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
  await repo.agregarTurno({ sesion_id: 'sesion-fija', rol: 'pepe', tipo: 'texto', texto: 'Planteamiento' });
}

beforeEach(() => preparar(llmConGuion([])));

describe('primer mensaje', () => {
  it('crea la sesión del reto de matemáticas y manda el planteamiento', async () => {
    const r = await procesar(deps, texto('hola'));
    expect(r.mensajes).toEqual(mate.planteamiento_pepe);
    expect(r.sesion).toMatchObject({ reto_id: mate.id, fase: 'nivel', nivel: 0 });
    expect(repo.datos.turnos.map((t) => t.rol)).toEqual(['alumno', 'pepe', 'pepe']);
    expect(llm.peticiones).toHaveLength(0);
  });

  it('el saludo no se evalúa como respuesta', async () => {
    await procesar(deps, texto('hola'));
    expect(repo.datos.evaluaciones).toHaveLength(0);
  });
});

describe('reto 1 de punta a punta', () => {
  it('resuelve en nivel 0, explica y queda el siguiente reto pendiente', async () => {
    const masDificil = retoSintetico({ id: 'mate-suma-fracciones-02', concepto: mate.concepto, dificultad: 2 });
    preparar(llmConGuion(['correcta']), { banco: [...listarRetos(), masDificil] });
    await procesar(deps, texto('hola'));
    const r1 = await procesar(deps, texto('No, está mal: los de abajo no se suman, da 5/6'));
    expect(r1.sesion?.fase).toBe('cierre');
    expect(r1.detalle).toMatchObject({ accion: 'pedir_explicacion', clasificacion: 'correcta', origen_juez: 'llm' });

    const r2 = await procesar(deps, texto('porque los pedazos son de distinto tamaño'));
    expect(r2.sesion?.fase).toBe('terminado');
    expect(r2.mensajes[0]).toContain('me salvaste');
    expect(repo.datos.evaluaciones_finales[0]).toMatchObject({ resuelto: true, nivel_ayuda_maximo: 0 });
    expect(repo.datos.evaluaciones).toHaveLength(1);

    // El siguiente reto queda pendiente y arranca con el próximo mensaje.
    const pendiente = await repo.sesionActiva(ALUMNO);
    expect(pendiente?.fase).toBe('pendiente');
    expect(pendiente?.reto_id).toBe('mate-suma-fracciones-02');
    const r3 = await procesar(deps, texto('otro'));
    expect(r3.sesion?.reto_id).toBe(pendiente?.reto_id);
    expect(r3.sesion?.fase).not.toBe('pendiente');
  });

  it('no sabe nada: recorre los niveles 0 a 4 y lo resuelve en el 4', async () => {
    preparar(llmConGuion(['incorrecta', 'no_se', 'no_se', 'no_se', 'paso_correcto', 'paso_correcto', 'paso_correcto', 'correcta']));
    await procesar(deps, texto('hola'));
    const niveles: number[] = [];
    for (const t of ['sí está bien', 'no sé', 'no sé', 'no sé', '6', '3', '2', '5/6 porque ya son del mismo tamaño']) {
      const r = await procesar(deps, texto(t));
      niveles.push(r.sesion!.nivel);
    }
    expect(niveles).toEqual([1, 2, 3, 4, 4, 4, 4, 4]);
    const s = await repo.sesionActiva(ALUMNO);
    expect(s?.fase).toBe('cierre');
    // Pepe nunca dijo la respuesta.
    const dePepe = repo.datos.turnos.filter((t) => t.rol === 'pepe').map((t) => t.texto).join(' ');
    expect(dePepe).not.toContain('5/6');
  });

  it('guarda cada evaluación con el nivel y paso en que se contestó', async () => {
    preparar(llmConGuion(['incorrecta', 'paso_correcto']));
    await procesar(deps, texto('hola'));
    await procesar(deps, texto('sí'));
    await procesar(deps, texto('B'));
    expect(repo.datos.evaluaciones.map((e) => [e.clasificacion, e.nivel, e.paso])).toEqual([
      ['incorrecta', 0, 0],
      ['paso_correcto', 1, 0],
    ]);
  });

  it('le pasa al Juez la pregunta que hizo Pepe y la respuesta', async () => {
    preparar(llmConGuion(['incorrecta']));
    await procesar(deps, texto('hola'));
    await procesar(deps, texto('sí, está bien'));
    const p = llm.de('juez')[0]!.prompt;
    expect(p).toContain(mate.planteamiento_pepe[1]);
    expect(p).toContain('<<<\nsí, está bien\n>>>');
  });

  it('cuando el Juez duda (confianza baja), sube de nivel sin atajo', async () => {
    preparar(llmConGuion([['correcta', { confianza: 0.2 }]]));
    await procesar(deps, texto('hola'));
    const r = await procesar(deps, texto('mmm'));
    expect(r.sesion).toMatchObject({ fase: 'nivel', nivel: 1 });
    expect(repo.datos.evaluaciones[0]).toMatchObject({ clasificacion: 'parcial', juez: { clasificacion_juez: 'correcta' } });
  });
});

describe('idempotencia', () => {
  it('un mensaje repetido no se procesa dos veces', async () => {
    preparar(llmConGuion(['incorrecta', 'incorrecta']));
    await procesar(deps, texto('hola', 'wamid.1'));
    const r1 = await procesar(deps, texto('sí', 'wamid.2'));
    const turnos = repo.datos.turnos.length;
    const r2 = await procesar(deps, texto('sí', 'wamid.2'));
    expect(r1.duplicado).toBe(false);
    expect(r2).toMatchObject({ duplicado: true, mensajes: [] });
    expect(repo.datos.turnos).toHaveLength(turnos);
    expect(llm.de('juez')).toHaveLength(1);
  });

  it('también el primer mensaje', async () => {
    await procesar(deps, texto('hola', 'wamid.1'));
    expect((await procesar(deps, texto('hola', 'wamid.1'))).duplicado).toBe(true);
    expect(repo.datos.sesiones).toHaveLength(1);
  });
});

describe('carreras (bloqueo optimista)', () => {
  it('si otro mensaje actualiza la sesión primero, se vuelve a evaluar sobre la nueva', async () => {
    preparar(llmConGuion(['incorrecta', 'no_se']));
    await procesar(deps, texto('hola'));
    // Simula otro proceso que sube la sesión al nivel 1 justo antes de guardar.
    const original = repo.actualizarSesion.bind(repo);
    let primera = true;
    repo.actualizarSesion = async (anterior, nueva) => {
      if (primera) {
        primera = false;
        const actual = (await repo.sesionPorId(anterior.id))!;
        await original(actual, { ...actual, nivel: 1, nivel_max: 1 });
      }
      return original(anterior, nueva);
    };
    const r = await procesar(deps, texto('no sé'));
    expect(llm.de('juez')).toHaveLength(2);
    expect(r.sesion).toMatchObject({ nivel: 2, version: 2 });
  });
});

describe('una sola sesión activa', () => {
  it('dos mensajes simultáneos de un alumno nuevo no crean dos sesiones', async () => {
    preparar(llmConGuion(['incorrecta']));
    const rs = await Promise.all([procesar(deps, texto('hola', 'm1')), procesar(deps, texto('oye', 'm2'))]);
    expect(repo.datos.sesiones).toHaveLength(1);
    expect(repo.datos.turnos.filter((t) => t.rol === 'alumno')).toHaveLength(2);
    // El que pierde la carrera no se evalúa como respuesta al reto.
    expect(llm.de('juez')).toHaveLength(0);
    expect(repo.datos.evaluaciones).toHaveLength(0);
    expect(repo.datos.sesiones[0]).toMatchObject({ nivel: 0, nivel_max: 0 });
    expect(rs.filter((r) => r.mensajes.length > 0)).toHaveLength(1);
  });
});

describe('sin LLM (caído o sin llaves)', () => {
  it('Pepe contesta con el ejemplo del paso y la conversación sigue', async () => {
    preparar(llmFalso({ pepe: () => { throw new Error('caído'); }, juez: () => { throw new Error('caído'); } }));
    await procesar(deps, texto('hola'));
    const r = await procesar(deps, texto('sí'));
    expect(r.sesion?.nivel).toBe(1);
    expect(r.mensajes).toEqual(mate.niveles['1'].pasos[0]!.ejemplo);
    expect(r.botones).toEqual(['A', 'B', 'Las dos están bien']);
    expect(r.detalle).toMatchObject({ origen_pepe: 'fijo', origen_juez: 'respaldo' });
  });
});

describe('reto 2: lectura con voz', () => {
  it('presenta el texto, recibe la nota de voz, guarda la fluidez y plantea', async () => {
    preparar(llmConGuion([]), { transcribir: transcriptorPerfecto });
    await empezarEn(lectura.id, 'leyendo_texto');
    const r = await procesar(deps, audio());
    expect(r.sesion).toMatchObject({ fase: 'nivel', nivel: 0 });
    expect(r.mensajes).toEqual(lectura.planteamiento_pepe);
    expect(repo.datos.fluidez[0]).toMatchObject({ precision_est: 1, pausas_largas: 0 });
    expect(repo.datos.fluidez[0]!.palabras_texto).toBeGreaterThan(70);
    // Solo se guarda el texto transcrito, con tipo audio.
    expect(repo.datos.turnos.find((t) => t.rol === 'alumno')).toMatchObject({ tipo: 'audio' });
  });

  it('si manda texto, Pepe insiste una vez; a la segunda sigue sin métricas', async () => {
    await empezarEn(lectura.id, 'leyendo_texto');
    const r1 = await procesar(deps, texto('ya lo leí'));
    expect(r1.detalle?.accion).toBe('insistir_lectura');
    const r2 = await procesar(deps, texto('mejor así'));
    expect(r2.detalle?.accion).toBe('plantear');
    expect(repo.datos.fluidez).toHaveLength(0);
  });

  it('si dice que no puede grabar, sigue de inmediato', async () => {
    await empezarEn(lectura.id, 'leyendo_texto');
    const r = await procesar(deps, texto('no tengo micrófono'));
    expect(r.detalle?.accion).toBe('plantear');
  });

  it('si la transcripción falla, pide el audio otra vez sin cambiar nada', async () => {
    preparar(llmConGuion([]), { transcribir: async () => { throw new Error('caído'); } });
    await empezarEn(lectura.id, 'leyendo_texto');
    const r = await procesar(deps, audio());
    expect(r.mensajes[0]).toContain('no alcancé a escuchar');
    expect(r.sesion?.fase).toBe('leyendo_texto');
  });

  it('sin transcriptor configurado, también pide de nuevo', async () => {
    await empezarEn(lectura.id, 'leyendo_texto');
    expect((await procesar(deps, audio())).mensajes[0]).toContain('no alcancé a escuchar');
  });

  it('una respuesta por voz en el reto entra al Juez como texto', async () => {
    preparar(llmConGuion(['incorrecta']), {
      transcribir: async () => ({ texto: 'sí, por la pesca', palabras: [] }),
    });
    await empezarEn(mate.id);
    await procesar(deps, audio());
    expect(llm.de('juez')[0]!.prompt).toContain('<<<\nsí, por la pesca\n>>>');
  });
});

describe('elegirRetoInicial', () => {
  const banco = listarRetos();

  it('empieza con matemáticas', () => {
    expect(elegirRetoInicial(banco, null, [])?.materia).toBe('matematicas');
  });

  it('respeta el siguiente reto que dejó la sesión anterior', () => {
    const ultima = { siguiente_reto_id: lectura.id } as Sesion;
    expect(elegirRetoInicial(banco, ultima, [])?.id).toBe(lectura.id);
  });

  it('salta los retos ya hechos', () => {
    expect(elegirRetoInicial(banco, null, [mate.id])?.id).not.toBe(mate.id);
  });

  it('si ya hizo todos, repite en vez de quedarse sin reto', () => {
    expect(elegirRetoInicial(banco, null, banco.map((r) => r.id))).not.toBeNull();
  });
});
