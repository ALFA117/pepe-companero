/**
 * Intenciones que NO son una respuesta al reto (sin LLM, con reglas fijas).
 *
 * Se revisan antes del Juez para que:
 *   - un "hola", "jaja", "ok" o "espera" no suba el nivel de ayuda (el nivel es
 *     el diagnóstico que ve el maestro: no se puede ensuciar con saludos);
 *   - un mensaje de riesgo ("me quiero morir") reciba una respuesta humana con
 *     ayuda real y le llegue al maestro, en vez de calificarse como "no sé";
 *   - existan atajos claros: menú, repetir, progreso, pista, otro reto;
 *   - un "no sé" o "dame una pista" no gaste una llamada al Juez.
 *
 * Las reglas de saludo, risa, etc. exigen que el mensaje COMPLETO sea eso: "hola,
 * no se suman los de abajo" sí es una respuesta y va al Juez. La única regla que
 * busca dentro del mensaje es la de riesgo, porque ahí un falso positivo cuesta
 * poco y un falso negativo cuesta mucho.
 */

export type Intencion =
  | 'riesgo'
  | 'groseria'
  | 'saludo'
  | 'risa'
  | 'enterado'
  | 'gracias'
  | 'espera'
  | 'despedida'
  | 'menu'
  | 'repetir'
  | 'progreso'
  | 'cambiar'
  | 'pista'
  | 'no_se';

/** Minúsculas, sin acentos, sin signos al inicio/final y sin letras repetidas de más ("holaaa"). */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[¡!¿?.,;:…"'*_~]+/g, ' ')
    .replace(/(.)\1{2,}/g, '$1$1')
    .replace(/\s+/g, ' ')
    .trim();
}

const RE_RIESGO = new RegExp(
  [
    'me quiero morir',
    'quiero morirme',
    'me quiero matar',
    'quiero matarme',
    'matarme',
    'suicid\\w*',
    'no quiero (seguir )?vivir',
    'quitarme la vida',
    'cortarme',
    'me estoy cortando',
    'hacerme dano',
    'me hago dano',
    'me (pegan|golpean|lastiman|maltratan|acosan|amenazan)',
    'abusan? de mi',
    'abusaron de mi',
    'me violaron',
    'me hacen (bullying|bulin|bulling)',
    'nadie me quiere',
  ].join('|'),
);

const RE_GROSERIA =
  /\b(idiota|estupid[oa]|pendej\w*|imbecil|tont[oa]|babos[oa]|mens[oa]|chinga\w*|verga|put[oa]|cabron\w*|mierda|callate|inutil|naco)\b/;

const COMPLETO: [Intencion, RegExp][] = [
  ['saludo', /^(hola+|holi+s?|ola|buenas( tardes| noches| dias)?|buen(os)? dias?|que onda|q onda|k onda|que tal|hey|ey|hi|hello)( pepe)?$/],
  ['risa', /^((ja|je|ji|jo|js|xd|ks)+|lol|lmao|xd+)$/],
  ['enterado', /^(ok(ay|i|is)?|va|vale|sale|bueno|aja|mm+|hm+|ah+|oh+|ya veo|entiendo|okey|de acuerdo|perfecto|nice|chido|orale)$/],
  ['gracias', /^(muchas )?(gracias|grax|grasias|thx|thanks|ty)( pepe)?$/],
  ['espera', /^(espera(me)?|esperate|dejame pensar(le)?|deja (pienso|pensar)|ahorita|un momento|un segundo|un seg|dame chance|pensando|estoy pensando|ya casi|aguanta)$/],
  ['despedida', /^(adios|bye|bai|chao|chau|nos vemos|ya me voy|me tengo que ir|al rato|hasta luego|luego|hasta manana)( pepe)?$/],
  ['menu', /^(menu|ayuda|help|comandos|instrucciones|opciones|como funciona|como se juega|que hago|que tengo que hacer|que hay que hacer)$/],
  ['repetir', /^(repite(lo)?|repetir( la)?( pregunta)?|otra vez( la pregunta)?|cual era la pregunta|que preguntaste|de nuevo|no vi la pregunta|que me preguntaste)$/],
  ['progreso', /^(mi progreso|progreso|como voy|mis retos|mi nivel|en que nivel voy|que nivel voy|mis puntos|puntos)$/],
  ['cambiar', /^(otro reto|otro|cambiar( de)?( reto)?|siguiente reto|saltar|skip|otra tarea|ya no quiero|no quiero|me aburri|esta aburrido|que aburrido)$/],
  ['pista', /^((dame|me das|quiero|necesito) (una )?pista|pista|una pista|dame una ayuda|ayudame( porfa)?)$/],
  ['no_se', /^(no se|nose|nos e|ni idea|no tengo idea|no lo se|no se la verdad|la verdad no se|no entiendo|no le entiendo|no se nada)$/],
];

/** Sin letras ni números: solo emojis o signos ("👍", "😂😂", "..."). */
function soloEmojis(original: string): boolean {
  return original.trim().length > 0 && !/[\p{L}\p{N}]/u.test(original);
}

export function detectarIntencion(original: string): Intencion | null {
  const t = normalizar(original);
  if (RE_RIESGO.test(t)) return 'riesgo';
  if (/^[\s?¿]+$/.test(original)) return 'repetir'; // "?" = "¿qué?"
  if (soloEmojis(original)) return 'enterado';
  for (const [intencion, re] of COMPLETO) if (re.test(t)) return intencion;
  // Insulto sin nada más que valga como respuesta (máximo 4 palabras).
  if (RE_GROSERIA.test(t) && t.split(' ').length <= 4) return 'groseria';
  return null;
}

/** Línea de la Vida (CONASAMA): gratis, 24 horas, todo México. */
export const LINEA_DE_LA_VIDA = '800 911 2000';

export const MENSAJES_RIESGO = [
  'Oye, gracias por contármelo. Lo que sientes importa muchísimo 💛',
  `No tienes que cargar con esto sin ayuda: cuéntale hoy a un adulto de confianza (tu profe, tu mamá, tu papá). Si lo necesitas ya, en la Línea de la Vida te escuchan gratis las 24 horas: ${LINEA_DE_LA_VIDA}.`,
  'Le voy a avisar a tu profe para que te pueda apoyar. Aquí sigo cuando quieras platicar o seguir con la tarea.',
];

/** Lo que se guarda para que el maestro lo vea en "Necesitan atención hoy". */
export const BRECHA_ALERTA = 'alerta_bienestar';
