/**
 * Datos de demostración: el grupo "1° B" con 45 alumnos ficticios y una
 * semana de sesiones realistas, para que el panel se vea lleno en la demo.
 * Determinista (misma semilla, mismos datos) y marcado con `es_demo = true`.
 */
import type { DatosMemoria } from '@/db/memoria';
import type { Alumno, Grupo, SesionGuardada, TurnoGuardado } from '@/db/repositorio';
import { esUltimoPaso, pasosDelNivel } from '@/motor/maquina';
import type { Clasificacion, EvaluacionFinal, Reto } from '@/motor/tipos';

export const GRUPO_DEMO_ID = '00000000-0000-4000-8000-0000000000d1';
export const ALUMNOS_DEMO = 45;

const NOMBRES = [
  'Sofía', 'Mateo', 'Valentina', 'Santiago', 'Regina', 'Leonardo', 'Ximena', 'Diego', 'Camila', 'Emiliano',
  'Renata', 'Sebastián', 'Fernanda', 'Iker', 'Daniela', 'Gael', 'Valeria', 'Ángel', 'Natalia', 'Luis',
  'Andrea', 'Tadeo', 'Mariana', 'Emilio', 'Paula', 'Jesús', 'Victoria', 'Alexander', 'Romina', 'Rodrigo',
  'Itzel', 'Axel', 'Abril', 'Daniel', 'Melanie', 'Josué', 'Frida', 'Bruno', 'Ana Paula', 'Kevin',
  'Zoe', 'Uriel', 'Danna', 'Óscar', 'Jimena',
];
const APELLIDOS = [
  'Hernández', 'García', 'Martínez', 'López', 'González', 'Pérez', 'Rodríguez', 'Sánchez', 'Ramírez', 'Cruz',
  'Flores', 'Gómez', 'Morales', 'Vázquez', 'Reyes', 'Jiménez', 'Torres', 'Díaz', 'Gutiérrez', 'Ruiz',
  'Mendoza', 'Aguilar', 'Ortiz', 'Moreno', 'Castillo', 'Romero', 'Álvarez', 'Méndez', 'Chávez', 'Rivera',
];

/** Brechas típicas por concepto (lo que el Juez reportaría). */
const BRECHAS: Record<string, string[]> = {
  suma_fracciones_distinto_denominador: ['fracciones_equivalentes', 'tamaño_de_las_partes', 'comparar_fracciones'],
  fracciones_equivalentes: ['fracciones_equivalentes', 'multiplicacion_como_escala'],
  ecuaciones_primer_grado: ['operaciones_inversas', 'equilibrio_de_la_igualdad'],
  porcentajes: ['porcentaje_como_fraccion', 'calculo_mental_con_100'],
  jerarquia_operaciones: ['jerarquia_operaciones', 'multiplicacion_como_suma_repetida'],
  inferencia_causal: ['vocabulario: contaminación', 'conectores_causales', 'localizar_informacion_literal'],
  localizar_informacion_literal: ['localizar_informacion_literal', 'releer_para_verificar'],
  idea_principal: ['idea_principal_vs_detalle', 'resumir_parrafos'],
  vocabulario_en_contexto: ['vocabulario: porosa', 'usar_pistas_de_contexto'],
  secuencia_de_hechos: ['marcadores_temporales', 'releer_para_verificar'],
};

/** Respuestas de alumno de ejemplo, por clasificación. */
const RESPUESTAS: Record<string, string[]> = {
  incorrecta: ['sí, está bien', 'creo que sí', 'yo digo que sí le atinaste', 'sí'],
  no_se: ['no sé', 'nose', 'mmm no sé la verdad', 'ni idea'],
  pide_respuesta: ['ya dime la respuesta', 'pásamela porfa', 'nomás dime cuánto es'],
  parcial: ['algo está mal pero no sé qué', 'no creo que esté bien', 'me late que no'],
  paso_correcto: ['B', 'menos', 'no', 'párrafo 2', 'sí', 'dos', 'el de 4'],
  fuera_de_tema: ['oye y tú qué juegos tienes', 'hazme mi tarea de historia', 'jajaja'],
};

const EXPLICACIONES: Record<string, string[]> = {
  matematicas: [
    'es que no se pueden sumar los de abajo porque son pedazos de distinto tamaño',
    'primero hay que hacerlos del mismo tamaño y ya luego sumas',
    'porque si haces lo mismo de los dos lados queda igual',
    'el porcentaje es una parte del total no son pesos',
    'la multiplicación va primero porque son grupos',
  ],
  lectura: [
    'el texto no dice eso, en el párrafo 2 dice otra cosa',
    'porque lo busqué en el texto y decía otra fecha',
    'son dos causas, la contaminación y la tilapia, no la pesca',
    'la idea principal tiene que hablar de todo el texto no de una parte',
    'porosa es que deja pasar el agua porque dice que los químicos se filtran',
  ],
};

/** Generador pseudoaleatorio con semilla (mulberry32). */
function azar(semilla: number) {
  let a = semilla >>> 0;
  const sig = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    sig,
    entero: (min: number, max: number) => min + Math.floor(sig() * (max - min + 1)),
    elegir: <T>(xs: readonly T[]) => xs[Math.floor(sig() * xs.length)]!,
    normal: (media: number, desv: number) => {
      const u = 1 - sig();
      const v = sig();
      return media + desv * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    },
  };
}

function uuid(r: ReturnType<typeof azar>): string {
  const h = Array.from({ length: 32 }, () => Math.floor(r.sig() * 16).toString(16)).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

export interface OpcionesDemo {
  banco: readonly Reto[];
  ahora?: Date;
  semilla?: number;
}

/** Genera el grupo de demo listo para insertar (formato de las tablas). */
export function generarDemo({ banco, ahora = new Date(), semilla = 20261123 }: OpcionesDemo): Omit<DatosMemoria, 'grupos'> & { grupo: Grupo } {
  const r = azar(semilla);
  const grupo: Grupo = {
    id: GRUPO_DEMO_ID,
    nombre: '1° B',
    escuela: 'Secundaria Técnica (demo)',
    docente_nombre: 'Mtra. Laura Ríos',
    es_demo: true,
  };
  const datos = {
    grupo,
    alumnos: [] as Alumno[],
    sesiones: [] as SesionGuardada[],
    turnos: [] as TurnoGuardado[],
    evaluaciones: [] as DatosMemoria['evaluaciones'],
    evaluaciones_finales: [] as DatosMemoria['evaluaciones_finales'],
    fluidez: [] as DatosMemoria['fluidez'],
  };

  const mate = banco.filter((x) => x.materia === 'matematicas');
  const lectura = banco.filter((x) => x.materia === 'lectura');

  for (let i = 0; i < ALUMNOS_DEMO; i++) {
    const alumno: Alumno = {
      id: uuid(r),
      grupo_id: grupo.id,
      nombre: `${NOMBRES[i % NOMBRES.length]} ${r.elegir(APELLIDOS)}`,
      codigo: `PEPE-DEMO-${String(i + 1).padStart(2, '0')}`,
      tel_hash: null,
      tel_cifrado: null,
      ultimo_mensaje_wa_en: null,
    };
    datos.alumnos.push(alumno);

    // Habilidad de 0 (le cuesta mucho) a 1 (va sobrado); algunos no entraron.
    const habilidad = Math.min(1, Math.max(0, r.normal(0.55, 0.25)));
    const pideMucho = r.sig() < 0.08;
    const leeLento = r.sig() < 0.12;
    const numSesiones = r.sig() < 0.07 ? 0 : r.entero(1, 6);

    // Inicios en orden cronológico: solo la última sesión puede quedar en curso.
    const inicios = Array.from({ length: numSesiones }, () => r.entero(2, 7 * 24 * 60)).sort((a, b) => b - a);
    for (let k = 0; k < numSesiones; k++) {
      const esUltima = k === numSesiones - 1;
      const reto = r.elegir(r.sig() < 0.55 ? mate : lectura);
      const inicio = new Date(ahora.getTime() - inicios[k]! * 60_000);
      let t = inicio.getTime();
      const tick = () => {
        t += r.entero(15, 90) * 1000;
        return new Date(t).toISOString();
      };
      const sesionId = uuid(r);
      const turnos: TurnoGuardado[] = [];
      const turno = (rol: 'alumno' | 'pepe', texto: string, tipo: TurnoGuardado['tipo'] = 'texto') => {
        const tg: TurnoGuardado = { id: uuid(r), sesion_id: sesionId, rol, tipo, texto, creado_en: tick() };
        turnos.push(tg);
        return tg;
      };

      // Lectura en voz alta.
      if (reto.requiere_lectura_voz && reto.texto) {
        turno('pepe', '¡Qué onda! Hoy me dejaron leer esto, pero leo bien lento 🐢');
        turno('pepe', '¿Me lo lees en una nota de voz? 🎙️');
        if (r.sig() < 0.85) {
          const palabras = reto.texto.parrafos.join(' ').split(/\s+/).length;
          const ppm = Math.max(35, Math.round(leeLento ? r.normal(58, 8) : r.normal(112, 18)));
          const duracion = Math.round((palabras / ppm) * 60 * 100) / 100;
          const precision = Math.min(1, Math.max(0.6, r.normal(leeLento ? 0.82 : 0.94, 0.04)));
          turno('alumno', reto.texto.parrafos.join(' '), 'audio');
          datos.fluidez.push({
            sesion_id: sesionId,
            palabras_texto: palabras,
            palabras_correctas_est: Math.round(palabras * precision),
            duracion_voz_s: duracion,
            ppm,
            pausas_largas: leeLento ? r.entero(2, 6) : r.entero(0, 1),
            precision_est: Math.round(precision * 1000) / 1000,
            creado_en: new Date(t).toISOString(),
          });
        } else {
          turno('alumno', 'no puedo grabar');
        }
      }

      for (const m of reto.planteamiento_pepe) turno('pepe', m);

      // Recorrido por la escalera según la habilidad.
      let nivel = 0;
      let paso = 0;
      let nivelMax = 0;
      let pidio = 0;
      let resuelto = false;
      let atorado = false;
      const brechas = new Set<string>();
      for (let guarda = 0; guarda < 20; guarda++) {
        const pResolver = Math.min(0.92, habilidad * 0.7 + nivel * 0.12);
        let clas: Clasificacion;
        if (r.sig() < pResolver && (nivel === 0 || esUltimoPaso(reto, { nivel, paso }))) clas = 'correcta';
        else if (nivel > 0 && !esUltimoPaso(reto, { nivel, paso }) && r.sig() < 0.75) clas = 'paso_correcto';
        else if (pideMucho && r.sig() < 0.6) clas = 'pide_respuesta';
        else clas = r.elegir(['incorrecta', 'no_se', 'parcial'] as const);

        const t1 = turno('alumno', r.elegir(RESPUESTAS[clas] ?? ['mmm']));
        const brecha = clas === 'correcta' || clas === 'paso_correcto' ? null : r.elegir(BRECHAS[reto.concepto] ?? ['repaso_general']);
        if (brecha) brechas.add(brecha);
        datos.evaluaciones.push({
          id: uuid(r),
          turno_id: t1.id,
          sesion_id: sesionId,
          clasificacion: clas,
          nivel,
          paso,
          juez: { clasificacion: clas, brecha_probable: brecha, confianza: 0.9 },
          creado_en: t1.creado_en,
        });

        if (clas === 'correcta') {
          resuelto = true;
          break;
        }
        if (clas === 'pide_respuesta') pidio++;
        if (clas === 'paso_correcto') {
          paso++;
        } else if (nivel === 4) {
          if (esUltimoPaso(reto, { nivel, paso })) {
            atorado = true;
            break;
          }
          paso++;
        } else {
          nivel = clas === 'parcial' && nivel <= 1 && r.sig() < 0.4 ? 3 : nivel + 1;
          paso = 0;
          nivelMax = Math.max(nivelMax, nivel);
        }
        paso = Math.min(paso, pasosDelNivel(reto, nivel) - 1);
        const ej = nivel > 0 ? reto.niveles[String(nivel) as '1'].pasos[paso]?.ejemplo : undefined;
        turno('pepe', ej?.at(-1) ?? '¿Qué piensas?');
      }

      // ~1 de cada 6 sesiones se queda a la mitad (en curso).
      const enCurso = esUltima && ((!atorado && !resuelto) || (resuelto && r.sig() < 0.12));
      let fase: SesionGuardada['fase'] = 'terminado';
      if (resuelto && !enCurso) {
        turno('pepe', '¡Me salvaste! 🙌 ¿Me explicas con tus palabras qué estaba mal?');
        turno('alumno', r.elegir(EXPLICACIONES[reto.materia]!));
        turno('pepe', '¡Gracias, me salvaste la tarea! 🙌');
        const final: EvaluacionFinal = {
          resuelto: r.sig() < 0.92,
          nivel_ayuda_maximo: nivelMax,
          explicacion_final: {
            identifica_error: r.sig() < 0.85,
            explica_por_que: r.sig() < habilidad + 0.2,
            usa_evidencia_textual: reto.materia === 'lectura' ? r.sig() < 0.7 : null,
            vocabulario: r.elegir(['informal', 'informal', 'adecuado', 'tecnico'] as const),
          },
          brechas_detectadas: [...brechas].slice(0, 2),
          estrategia_aprendida: reto.materia === 'lectura' ? 'buscar la frase en el texto' : 'comprobar con un ejemplo',
          comentario_docente: nivelMax <= 1 ? 'Resolvió con poca ayuda y explica con sus palabras.' : 'Lo resolvió con apoyo de la escalera de ayuda.',
        };
        datos.evaluaciones_finales.push({ ...final, sesion_id: sesionId, creado_en: new Date(t).toISOString() });
      } else if (atorado) {
        turno('pepe', 'Uf, este nos costó mucho a los dos 😅 Le voy a pedir a la profe que nos eche la mano.');
      } else if (enCurso) {
        fase = resuelto ? 'cierre' : 'nivel';
      }

      const fin = new Date(t).toISOString();
      datos.sesiones.push({
        id: sesionId,
        alumno_id: alumno.id,
        reto_id: reto.id,
        canal: r.sig() < 0.6 ? 'whatsapp' : 'web',
        fase,
        nivel,
        paso,
        nivel_max: nivelMax,
        pidio_justificacion: false,
        insistio_lectura: false,
        contador_pide_respuesta: pidio,
        requiere_docente: atorado,
        siguiente_reto_id: null,
        version: turnos.length,
        creado_en: inicio.toISOString(),
        actualizado_en: fin,
      });
      datos.turnos.push(...turnos);
    }
  }
  return datos;
}
