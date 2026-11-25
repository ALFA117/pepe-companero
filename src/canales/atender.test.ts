import { createHmac } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { RepositorioMemoria } from '@/db/memoria';
import { cifrarTelefono, descifrarTelefono, hashTelefono } from '@/lib/telefono';
import { listarRetos, obtenerReto } from '@/retos/cargar';
import { juezCrudo, llmFalso } from '@/test/llm-falso';
import { atenderMensaje, type DependenciasAtender } from './atender';
import { firmaTwilio, textoConOpciones } from './twilio';
import type { Canal, MensajeEntrante } from './tipos';

const SAL = 'sal-de-prueba-123456';
const LLAVE = Buffer.alloc(32, 7).toString('base64');
const TEL = '5215512345678';
const mate = obtenerReto('mate-suma-fracciones-01');

class CanalFalso implements Canal {
  readonly nombre = 'falso';
  enviados: { a: string; texto: string; botones?: string[] }[] = [];
  escribiendo: string[] = [];
  async parsearEntrante() {
    return [];
  }
  async enviarTexto(a: string, texto: string) {
    this.enviados.push({ a, texto });
  }
  async enviarBotones(a: string, texto: string, botones: string[]) {
    this.enviados.push({ a, texto, botones });
  }
  async descargarAudio() {
    return { audio: new ArrayBuffer(4), mime: 'audio/ogg' };
  }
  async indicarEscribiendo(_: string, id: string) {
    this.escribiendo.push(id);
  }
}

let repo: RepositorioMemoria;
let canal: CanalFalso;
let deps: DependenciasAtender;
let n = 0;

const msg = (texto: string): MensajeEntrante => ({ id_externo: `wamid.${++n}`, de: TEL, tipo: 'texto', texto });

beforeEach(() => {
  repo = new RepositorioMemoria();
  canal = new CanalFalso();
  const llm = llmFalso({ pepe: () => ({ mensajes: ['Va 😅', '¿Cuál te late?'] }), juez: () => juezCrudo('incorrecta') });
  deps = {
    canal,
    motor: { repo, generar: llm.generar, banco: listarRetos() },
    hashTelefono: (t) => hashTelefono(t, SAL),
    cifrarTelefono: (t) => cifrarTelefono(t, LLAVE),
  };
});

describe('vinculación por código', () => {
  it('sin vincular, Pepe pide el código', async () => {
    await atenderMensaje(deps, msg('hola'));
    expect(canal.enviados.map((e) => e.texto).join(' ')).toContain('PEPE-1B-07');
    expect(repo.datos.sesiones).toHaveLength(0);
  });

  it('con un código válido vincula el teléfono (hash + cifrado) y arranca el reto', async () => {
    await atenderMensaje(deps, msg('mi código es pepe-1b-02'));
    const alumno = await repo.alumnoPorCodigo('PEPE-1B-02');
    expect(alumno?.tel_hash).toBe(hashTelefono(TEL, SAL));
    expect(alumno?.tel_hash).not.toContain(TEL);
    expect(alumno?.tel_cifrado).not.toContain(TEL);
    expect(descifrarTelefono(alumno!.tel_cifrado!, LLAVE)).toBe('525512345678'); // se guarda como 52 + 10 dígitos
    // Bienvenida + planteamiento en un solo mensaje de WhatsApp.
    expect(canal.enviados).toHaveLength(1);
    expect(canal.enviados[0]!.texto.startsWith('¡Listo, Alumno!')).toBe(true);
    for (const m of mate.planteamiento_pepe) expect(canal.enviados[0]!.texto).toContain(m);
    expect(alumno?.ultimo_mensaje_wa_en).not.toBeNull();
  });

  it('con un código que no existe, avisa', async () => {
    await atenderMensaje(deps, msg('PEPE-9Z-99'));
    expect(canal.enviados[0]?.texto).toContain('no encontré el código PEPE-9Z-99');
  });

  it('no deja vincular un código que ya tiene otro teléfono', async () => {
    await repo.vincularTelefono('00000000-0000-0000-0000-000000000101', 'otro-hash', 'x');
    await atenderMensaje(deps, msg('PEPE-1B-01'));
    expect(canal.enviados[0]?.texto).toContain('ya está conectado a otro número');
  });
});

describe('vincular con un reto ya en curso', () => {
  it('no evalúa un "hola" falso: repite la última pregunta de Pepe', async () => {
    // Empezó en la web y ya va en el nivel 1.
    await repo.insertarSesion({
      id: 's-web', alumno_id: '00000000-0000-0000-0000-000000000103', reto_id: mate.id, canal: 'web', fase: 'nivel',
      nivel: 1, paso: 0, nivel_max: 1, pidio_justificacion: false, insistio_lectura: false, contador_pide_respuesta: 0,
      requiere_docente: false, siguiente_reto_id: null, version: 3,
    });
    await repo.agregarTurno({ sesion_id: 's-web', rol: 'pepe', tipo: 'texto', texto: '¿Cuál te late que está mal?' });
    await atenderMensaje(deps, msg('PEPE-1B-03'));
    expect(repo.datos.evaluaciones).toHaveLength(0);
    expect((await repo.sesionPorId('s-web'))?.version).toBe(3);
    expect(canal.enviados.at(-1)).toMatchObject({ botones: ['A', 'B', 'Las dos están bien'] });
    expect(canal.enviados.at(-1)!.texto).toContain('Sigamos donde nos quedamos');
    expect(canal.enviados.at(-1)!.texto.endsWith('¿Cuál te late que está mal?')).toBe(true);
  });
});

describe('logs', () => {
  it('enmascara teléfonos en los errores', async () => {
    const { enmascarar } = await import('./atender');
    expect(enmascarar(new Error('To +52 1 55 1234 5678 no es válido'))).toBe('Error: To [tel] no es válido');
  });
});

describe('conversación por WhatsApp', () => {
  beforeEach(async () => {
    await atenderMensaje(deps, msg('PEPE-1B-01'));
    canal.enviados = [];
  });

  it('muestra escribiendo, responde y la última burbuja lleva los botones', async () => {
    const m = msg('sí, está bien');
    await atenderMensaje(deps, m);
    expect(canal.escribiendo).toContain(m.id_externo);
    // Las burbujas de Pepe van en un solo mensaje (WhatsApp cobra por mensaje).
    const [primero, segundo] = mate.niveles['1'].pasos[0]!.ejemplo;
    expect(canal.enviados).toEqual([{ a: TEL, texto: `${primero}\n\n${segundo}`, botones: ['A', 'B', 'Las dos están bien'] }]);
  });

  it('un mensaje duplicado del webhook no genera dos respuestas', async () => {
    const m = msg('sí');
    await atenderMensaje(deps, m);
    const enviados = canal.enviados.length;
    await atenderMensaje(deps, m);
    expect(canal.enviados).toHaveLength(enviados);
  });

  it('un sticker o una imagen no se evalúa ni cambia la sesión', async () => {
    const antes = { ...(await repo.sesionActiva(repo.datos.alumnos[0]!.id))! };
    await atenderMensaje(deps, { id_externo: `wamid.${++n}`, de: TEL, tipo: 'otro', descripcion: 'sticker' });
    expect(canal.enviados).toEqual([{ a: TEL, texto: expect.stringContaining('nota de voz') }]);
    expect(repo.datos.evaluaciones).toHaveLength(0);
    expect(await repo.sesionActiva(antes.alumno_id)).toMatchObject({ nivel: antes.nivel, paso: antes.paso, version: antes.version });
  });

  it('si algo truena, manda un mensaje amable en vez de quedarse callado', async () => {
    deps.motor.repo.ultimosTurnos = async () => {
      throw new Error('base caída');
    };
    await atenderMensaje(deps, msg('creo que está mal'));
    expect(canal.enviados.at(-1)?.texto).toContain('se me trabó');
  });
});

describe('teléfono', () => {
  it('el hash no depende del formato del número', () => {
    expect(hashTelefono('whatsapp:+52 1 55 1234 5678', SAL)).toBe(hashTelefono(TEL, SAL));
  });

  it('un celular de México con 521 o con 52 es el mismo alumno', () => {
    expect(hashTelefono('5215512345678', SAL)).toBe(hashTelefono('525512345678', SAL));
    expect(hashTelefono('whatsapp:+52 1 55 1234 5678', SAL)).toBe(hashTelefono('+52 55 1234 5678', SAL));
    expect(descifrarTelefono(cifrarTelefono('5215512345678', LLAVE), LLAVE)).toBe('525512345678');
    // Otros países no se tocan
    expect(hashTelefono('15551234567', SAL)).not.toBe(hashTelefono('5551234567', SAL));
  });

  it('cada cifrado es distinto pero descifra igual', () => {
    const a = cifrarTelefono(TEL, LLAVE);
    const b = cifrarTelefono(TEL, LLAVE);
    expect(a).not.toBe(b);
    expect(descifrarTelefono(a, LLAVE)).toBe('525512345678');
  });

  it('un cifrado alterado no se puede descifrar', () => {
    const c = cifrarTelefono(TEL, LLAVE).split(':');
    c[3] = Buffer.from('000000000000').toString('base64');
    expect(() => descifrarTelefono(c.join(':'), LLAVE)).toThrow();
  });
});

describe('Twilio', () => {
  it('firma URL + parámetros ordenados por nombre (HMAC-SHA1 en base64)', () => {
    const url = 'https://pepe.test/api/whatsapp';
    const firma = firmaTwilio('token', url, { To: 'b', Body: 'hola', From: 'a' });
    const esperada = createHmac('sha1', 'token').update(`${url}BodyholaFromaTob`).digest('base64');
    expect(firma).toBe(esperada);
  });

  it('los botones van como opciones en el texto', () => {
    expect(textoConOpciones('¿Cuál?', ['A', 'B'])).toBe('¿Cuál?\n\n• A\n• B\n(Escribe tu opción)');
  });
});

describe('agruparParaWhatsApp', () => {
  it('junta las burbujas en un mensaje', async () => {
    const { agruparParaWhatsApp } = await import('./atender');
    expect(agruparParaWhatsApp(['Hola', '¿Cómo vas?'])).toEqual([{ texto: 'Hola\n\n¿Cómo vas?' }]);
  });

  it('con botones respeta el límite de 1024 caracteres', async () => {
    const { agruparParaWhatsApp, MAX_TEXTO_CON_BOTONES } = await import('./atender');
    const largo = 'x'.repeat(600);
    const r = agruparParaWhatsApp([largo, largo, '¿Cuál?'], ['A', 'B']);
    expect(r).toEqual([{ texto: `${largo}\n\n${largo}` }, { texto: '¿Cuál?', botones: ['A', 'B'] }]);
    expect(r.every((m) => !m.botones || m.texto.length <= MAX_TEXTO_CON_BOTONES)).toBe(true);
  });

  it('sin mensajes no manda nada', async () => {
    const { agruparParaWhatsApp } = await import('./atender');
    expect(agruparParaWhatsApp([], ['A'])).toEqual([]);
  });
});
