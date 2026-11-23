/**
 * Prueba de propiedades: miles de conversaciones aleatorias (con semilla fija,
 * para que sea reproducible) contra los dos retos. Después de cada paso se
 * revisan los invariantes de la máquina.
 */
import { describe, expect, it } from 'vitest';
import { listarRetos } from '@/retos/cargar';
import { ev, evFinal, nueva } from '@/test/fabricas';
import { pasosDelNivel, transicion, type ContextoMotor } from './maquina';
import { CLASIFICACIONES, NIVELES_AYUDA, type EventoMotor, type Reto, type Sesion } from './tipos';

/** Generador pseudoaleatorio con semilla (mulberry32). */
function azar(semilla: number) {
  let a = semilla;
  const sig = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const elegir = <T>(xs: readonly T[]): T => xs[Math.floor(sig() * xs.length)] as T;
  return { sig, elegir };
}

function eventoAleatorio(s: Sesion, r: ReturnType<typeof azar>): EventoMotor {
  if (s.fase === 'leyendo_texto') {
    return r.sig() < 0.5
      ? { tipo: 'lectura_audio' }
      : { tipo: 'lectura_texto', no_puede_grabar: r.sig() < 0.2 };
  }
  if (s.fase === 'cierre') {
    return { tipo: 'evaluacion_final', evaluacion: evFinal({ resuelto: r.sig() < 0.8 }) };
  }
  return {
    tipo: 'evaluacion',
    evaluacion: ev(r.elegir(CLASIFICACIONES), {
      detecto_error: r.elegir([true, false, null]),
      explica_por_que: r.elegir(['si', 'parcial', 'no', null] as const),
      confianza: r.sig(),
    }),
  };
}

/**
 * Máximo de eventos "que cuentan" (todo menos fuera_de_tema) antes de terminar:
 * 2 de lectura + 2 en nivel 0 (justificación) + todos los pasos + cierre.
 */
function cotaDeEventos(reto: Reto): number {
  const pasos = NIVELES_AYUDA.reduce((t, n) => t + reto.niveles[n].pasos.length, 0);
  return 2 + 2 + pasos + 1;
}

describe.each(listarRetos().map((reto) => ({ reto })))('invariantes con 1000 conversaciones aleatorias: $reto.id', ({ reto }) => {
  const ctx: ContextoMotor = { reto, banco: [reto] };

  it('siempre termina y nunca rompe las reglas', () => {
    const r = azar(20261123);
    const cota = cotaDeEventos(reto);

    for (let conversacion = 0; conversacion < 1000; conversacion++) {
      let s = nueva(reto).sesion;
      let eventosQueCuentan = 0;

      for (let i = 0; i < 500 && s.fase !== 'terminado'; i++) {
        const evento = eventoAleatorio(s, r);
        const antes = s;
        const res = transicion(s, evento, ctx);
        s = res.sesion;

        const fueraDeTema =
          evento.tipo === 'evaluacion' && res.clasificacion_efectiva === 'fuera_de_tema';
        if (!fueraDeTema) eventosQueCuentan++;

        // Rango de nivel y paso.
        expect(s.nivel).toBeGreaterThanOrEqual(0);
        expect(s.nivel).toBeLessThanOrEqual(4);
        expect(s.paso).toBeLessThan(pasosDelNivel(reto, s.nivel));
        // Lo acumulado nunca baja.
        expect(s.nivel_max).toBeGreaterThanOrEqual(antes.nivel_max);
        expect(s.nivel_max).toBeGreaterThanOrEqual(s.nivel);
        expect(s.contador_pide_respuesta).toBeGreaterThanOrEqual(antes.contador_pide_respuesta);
        // El nivel nunca baja durante el reto.
        expect(s.nivel).toBeGreaterThanOrEqual(antes.nivel);
        // fuera_de_tema no cambia nada.
        if (fueraDeTema) expect(s).toEqual(antes);
        // La acción de guiar apunta al nivel y paso de la sesión.
        if (res.accion.tipo === 'guiar') {
          expect(res.accion).toMatchObject({ nivel: s.nivel, paso: s.paso });
          expect(s.nivel).toBeGreaterThan(0);
        }
        // requiere_docente solo aparece al terminar en el nivel 4.
        if (s.requiere_docente) expect(s).toMatchObject({ fase: 'terminado', nivel: 4 });
        // Identidad de la sesión intacta.
        expect(s).toMatchObject({ id: antes.id, alumno_id: antes.alumno_id, reto_id: antes.reto_id });
      }

      expect(s.fase).toBe('terminado');
      expect(eventosQueCuentan).toBeLessThanOrEqual(cota);
    }
  });
});
