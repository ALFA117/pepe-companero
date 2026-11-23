import { describe, expect, it } from 'vitest';
import type { Canal } from '@/canales/tipos';
import { RepositorioMemoria } from '@/db/memoria';
import type { DatosPanel, SesionGuardada } from '@/db/repositorio';
import { cifrarTelefono, descifrarTelefono } from '@/lib/telefono';
import { listarRetos, obtenerReto } from '@/retos/cargar';
import { llmFalso } from '@/test/llm-falso';
import { AVISO_RETO_NUEVO, asignarReto, ventanaAbierta } from './asignar';
import { calcularPanel, humanizar, infoDeRetos, mediana } from './calcular';

const AHORA = new Date('2026-11-24T18:00:00Z');
const hace = (dias: number) => new Date(AHORA.getTime() - dias * 86400_000).toISOString();
const retos = infoDeRetos(listarRetos());
const MATE = 'mate-suma-fracciones-01';
const LECT = 'lectura-inferencia-causal-ajolote-01';

let n = 0;
function sesion(alumno: string, extra: Partial<SesionGuardada> = {}): SesionGuardada {
  const t = extra.creado_en ?? hace(1);
  return {
    id: `s${++n}`,
    alumno_id: alumno,
    reto_id: MATE,
    canal: 'web',
    fase: 'terminado',
    nivel: 0,
    paso: 0,
    nivel_max: 0,
    pidio_justificacion: false,
    insistio_lectura: false,
    contador_pide_respuesta: 0,
    requiere_docente: false,
    siguiente_reto_id: null,
    version: 1,
    creado_en: t,
    actualizado_en: t,
    ...extra,
  };
}

function final(sesion_id: string, resuelto = true, brechas: string[] = []) {
  return {
    sesion_id,
    creado_en: hace(1),
    resuelto,
    nivel_ayuda_maximo: 0,
    explicacion_final: { identifica_error: true, explica_por_que: true, usa_evidencia_textual: null, vocabulario: 'informal' as const },
    brechas_detectadas: brechas,
    estrategia_aprendida: null,
    comentario_docente: '',
  };
}

function datos(): DatosPanel {
  const alumnos = ['ana', 'beto', 'caro', 'dani', 'eli'].map((id) => ({
    id,
    grupo_id: 'g',
    nombre: id.charAt(0).toUpperCase() + id.slice(1),
    codigo: `PEPE-1B-${id.toUpperCase()}`,
    tel_hash: null,
    tel_cifrado: null,
    ultimo_mensaje_wa_en: null,
  }));
  const sAna = sesion('ana', { nivel_max: 0 });
  const sBeto = sesion('beto', { nivel_max: 4, requiere_docente: true, nivel: 4 });
  const sCaro1 = sesion('caro', { reto_id: LECT, nivel_max: 2, creado_en: hace(2), contador_pide_respuesta: 3 });
  const sCaro2 = sesion('caro', { reto_id: LECT, nivel_max: 3, contador_pide_respuesta: 2 });
  const sDani1 = sesion('dani', { nivel_max: 4, creado_en: hace(3) });
  const sDani2 = sesion('dani', { nivel_max: 4, creado_en: hace(2) });
  const sViejo = sesion('eli', { creado_en: hace(20) });
  const sLect = [sesion('ana', { reto_id: LECT, creado_en: hace(4) }), sesion('beto', { reto_id: LECT, creado_en: hace(4) })];
  return {
    grupo: { id: 'g', nombre: '1° B', escuela: null, docente_nombre: null, es_demo: true },
    alumnos,
    sesiones: [sAna, sBeto, sCaro1, sCaro2, sDani1, sDani2, sViejo, ...sLect],
    finales: [
      final(sAna.id, true, ['fracciones_equivalentes']),
      final(sCaro1.id, true, ['vocabulario: contaminación']),
      final(sCaro2.id, true, ['fracciones_equivalentes']),
      final(sDani1.id, true, ['fracciones_equivalentes']),
      final(sDani2.id, false, ['tamaño_de_las_partes']),
    ],
    fluidez: [
      { sesion_id: sCaro2.id, creado_en: hace(1), palabras_texto: 80, palabras_correctas_est: 70, duracion_voz_s: 80, ppm: 50, pausas_largas: 3, precision_est: 0.87 },
      { sesion_id: sLect[0]!.id, creado_en: hace(4), palabras_texto: 80, palabras_correctas_est: 78, duracion_voz_s: 40, ppm: 120, pausas_largas: 0, precision_est: 0.97 },
      { sesion_id: sLect[1]!.id, creado_en: hace(4), palabras_texto: 80, palabras_correctas_est: 75, duracion_voz_s: 45, ppm: 107, pausas_largas: 0, precision_est: 0.94 },
    ],
    brechas_turno: [{ sesion_id: sBeto.id, brecha: 'fracciones_equivalentes' }],
  };
}

describe('calcularPanel', () => {
  const r = calcularPanel(datos(), retos, AHORA);

  it('indicadores de la semana', () => {
    expect(r.indicadores).toMatchObject({
      activos: 4, // eli solo tiene una sesión de hace 20 días
      total: 5,
      resueltos_matematicas: 2, // ana y dani1 (dani2 no resolvió, beto no tiene final)
      resueltos_lectura: 2,
    });
    expect(r.indicadores.ayuda_promedio).toBeCloseTo(2.1, 1);
  });

  it('brechas: top por número de alumnos distintos (no por veces)', () => {
    expect(r.brechas[0]).toEqual({ brecha: 'fracciones_equivalentes', etiqueta: 'Fracciones equivalentes', alumnos: 4 });
    expect(r.brechas.map((b) => b.brecha)).toContain('vocabulario: contaminación');
    expect(r.brechas.length).toBeLessThanOrEqual(4);
  });

  it('necesitan atención, con su motivo en una línea', () => {
    const por = Object.fromEntries(r.atencion.map((a) => [a.alumno_id, a.motivos.join(' | ')]));
    expect(por.beto).toContain('Se atoró en suma fracciones distinto denominador');
    expect(por.dani).toBe('Necesitó la ayuda máxima en 2 retos seguidos');
    expect(por.caro).toContain('Pidió la respuesta 5 veces');
    expect(por.caro).toContain('Lee a 50 ppm; la mediana del grupo es 107');
    expect(por.ana).toBeUndefined();
    expect(r.indicadores.necesitan_atencion).toBe(3);
  });

  it('tabla: estado, ayuda, intentos y fluidez; los que necesitan atención primero', () => {
    const t = Object.fromEntries(r.filas.todos.map((f) => [f.alumno_id, f]));
    expect(t.ana).toMatchObject({ estado: 'avanzando', ayuda: 0, materia: 'matematicas', ppm: 120 });
    expect(t.beto).toMatchObject({ estado: 'atorado', ayuda: 4 });
    expect(t.caro).toMatchObject({ estado: 'con_ayuda', materia: 'lectura', intentos: 2, ultimo_reto: 'El ajolote de Xochimilco' });
    expect(t.eli).toMatchObject({ intentos: 0 });
    expect(r.filas.todos.slice(0, 3).map((f) => f.alumno_id).sort()).toEqual(['beto', 'caro', 'dani']);
  });

  it('filtros por materia', () => {
    expect(r.filas.lectura.map((f) => f.alumno_id).sort()).toEqual(['ana', 'beto', 'caro']);
    expect(r.filas.matematicas.every((f) => f.materia === 'matematicas')).toBe(true);
  });

  it('ignora las sesiones pendientes', () => {
    const d = datos();
    d.sesiones.push(sesion('eli', { fase: 'pendiente', creado_en: hace(0) }));
    expect(calcularPanel(d, retos, AHORA).indicadores.activos).toBe(4);
  });

  it('un grupo vacío no truena', () => {
    const vacio = calcularPanel({ ...datos(), alumnos: [], sesiones: [], finales: [], fluidez: [], brechas_turno: [] }, retos, AHORA);
    expect(vacio.indicadores).toMatchObject({ activos: 0, total: 0, ayuda_promedio: null });
  });
});

describe('utilidades', () => {
  it('mediana', () => {
    expect(mediana([3, 1, 2])).toBe(2);
    expect(mediana([4, 1, 2, 3])).toBe(2.5);
    expect(mediana([])).toBeNull();
  });

  it('humanizar', () => {
    expect(humanizar('fracciones_equivalentes')).toBe('Fracciones equivalentes');
  });
});

describe('asignarReto', () => {
  const LLAVE = Buffer.alloc(32, 3).toString('base64');
  const ALUMNO = '00000000-0000-0000-0000-000000000101';

  class CanalFalso implements Canal {
    readonly nombre = 'falso';
    enviados: [string, string][] = [];
    async parsearEntrante() {
      return [];
    }
    async enviarTexto(a: string, t: string) {
      this.enviados.push([a, t]);
    }
    async enviarBotones() {}
  }

  async function preparar(ultimoMensaje: string | null, conTelefono = true) {
    const repo = new RepositorioMemoria();
    if (conTelefono) await repo.vincularTelefono(ALUMNO, 'hash', cifrarTelefono('5215500000000', LLAVE));
    if (ultimoMensaje) await repo.marcarMensajeWhatsApp(ALUMNO, new Date(ultimoMensaje));
    const canal = new CanalFalso();
    const deps = {
      motor: { repo, generar: llmFalso({}).generar, banco: listarRetos() },
      canal,
      descifrarTelefono: (v: string) => descifrarTelefono(v, LLAVE),
      ahora: () => AHORA,
    };
    return { repo, canal, deps };
  }

  it('dentro de las 24 h, Pepe le escribe por WhatsApp y la sesión arranca', async () => {
    const { repo, canal, deps } = await preparar(hace(0.5));
    const r = await asignarReto(deps, ALUMNO, MATE);
    expect(r.estado).toBe('enviado');
    expect(canal.enviados.map(([, t]) => t)).toEqual([AVISO_RETO_NUEVO, ...obtenerReto(MATE).planteamiento_pepe]);
    expect(canal.enviados[0]![0]).toBe('5215500000000');
    expect((await repo.sesionActiva(ALUMNO))?.fase).toBe('nivel');
  });

  it('fuera de las 24 h, queda pendiente y no manda nada', async () => {
    const { repo, canal, deps } = await preparar(hace(2));
    expect(await asignarReto(deps, ALUMNO, LECT)).toMatchObject({ estado: 'pendiente', motivo: 'ventana_cerrada' });
    expect(canal.enviados).toEqual([]);
    expect((await repo.sesionActiva(ALUMNO))?.fase).toBe('pendiente');
  });

  it('sin WhatsApp vinculado, queda pendiente', async () => {
    const { deps } = await preparar(null, false);
    expect(await asignarReto(deps, ALUMNO, MATE)).toMatchObject({ estado: 'pendiente', motivo: 'sin_whatsapp' });
  });

  it('si falla el envío, queda pendiente (no se pierde la asignación)', async () => {
    const { deps, canal } = await preparar(hace(0.1));
    canal.enviarTexto = async () => {
      throw new Error('Kapso caído');
    };
    expect(await asignarReto(deps, ALUMNO, MATE)).toMatchObject({ estado: 'pendiente', motivo: 'error_envio' });
  });

  it('ventanaAbierta', () => {
    expect(ventanaAbierta(null, AHORA)).toBe(false);
    expect(ventanaAbierta(hace(0.99), AHORA)).toBe(true);
    expect(ventanaAbierta(hace(1.01), AHORA)).toBe(false);
  });
});
