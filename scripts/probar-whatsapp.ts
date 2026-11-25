/**
 * Prueba del flujo de WhatsApp de punta a punta SIN mandar mensajes reales:
 * webhook firmado como Kapso → vinculación por código → motor con el LLM real
 * → Supabase. El envío se captura en memoria en vez de ir a Kapso.
 *
 *   pnpm probar-whatsapp [ruta/a/nota.m4a]
 *
 * Usa el alumno de pruebas PEPE-1B-03 y un teléfono ficticio; al terminar
 * borra sus sesiones y lo desvincula.
 */
import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { atenderMensaje } from '../src/canales/atender';
import { CanalKapso } from '../src/canales/kapso';
import { FirmaInvalidaError } from '../src/canales/tipos';
import { cifrarTelefono, descifrarTelefono, hashTelefono, normalizarTelefono } from '../src/lib/telefono';
import { dependenciasMotor } from '../src/motor/servidor';

process.loadEnvFile('.env.local');
const SECRETO = process.env.KAPSO_WEBHOOK_SECRET!;
const TEL = '5215500000001';
const TEL_OTRO = '5215500000002';
const CODIGO = 'PEPE-1B-03';
const audioPath = process.argv[2];

const enviados: { a: string; texto: string; botones?: string[] }[] = [];
class CanalCapturado extends CanalKapso {
  override async enviarTexto(a: string, texto: string) { enviados.push({ a, texto }); }
  override async enviarBotones(a: string, texto: string, botones: string[]) { enviados.push({ a, texto, botones }); }
  override async indicarEscribiendo() {}
  override async descargarAudio() {
    const b = readFileSync(audioPath!);
    return { audio: b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer, mime: 'audio/mp4' };
  }
}
const canal = new CanalCapturado({ apiKey: 'x', phoneNumberId: 'x', webhookSecret: SECRETO });
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const deps = { canal, motor: dependenciasMotor(), hashTelefono: (t: string) => hashTelefono(t), cifrarTelefono: (t: string) => cifrarTelefono(t) };

let n = 0;
function webhook(message: object, { firma, de = TEL, direction = 'inbound' }: { firma?: string; de?: string; direction?: string } = {}) {
  const cuerpo = JSON.stringify({ message: { id: `wamid.prueba.${Date.now()}.${n++}`, from: de, kapso: { direction }, ...message }, phone_number_id: 'x' });
  return new Request('https://pepe.test/api/whatsapp', {
    method: 'POST',
    body: cuerpo,
    headers: { 'X-Webhook-Event': 'whatsapp.message.received', 'X-Webhook-Signature': firma ?? createHmac('sha256', SECRETO).update(cuerpo).digest('hex') },
  });
}
async function llega(req: Request, etiqueta: string) {
  const antes = enviados.length;
  const ms = await canal.parsearEntrante(req);
  for (const m of ms) await atenderMensaje(deps, m);
  const nuevos = enviados.slice(antes);
  console.log(`\n▶ ${etiqueta}`);
  for (const e of nuevos) console.log(`  Pepe → ${e.a === TEL ? 'alumno' : e.a === TEL_OTRO ? 'otro' : '??'}: ${e.texto.replace(/\n/g, ' ⏎ ')}${e.botones ? `  [${e.botones.join(' | ')}]` : ''}`);
  return { ms, nuevos };
}
const ok = (c: boolean, m: string) => { console.log((c ? '  OK    ' : '  FALLA ') + m); if (!c) process.exitCode = 1; };

async function limpiar() {
  const { data: a } = await sb.from('alumnos').select('id').eq('codigo', CODIGO).single();
  await sb.from('sesiones').delete().eq('alumno_id', a!.id);
  await sb.from('alumnos').update({ tel_hash: null, tel_cifrado: null, ultimo_mensaje_wa_en: null }).eq('id', a!.id);
  return a!.id as string;
}

async function main() {
  const alumnoId = await limpiar();
  try {
    let fallo = false;
    try { await canal.parsearEntrante(webhook({ type: 'text', text: { body: 'hola' } }, { firma: 'abc' })); } catch (e) { fallo = e instanceof FirmaInvalidaError; }
    ok(fallo, 'firma inválida → FirmaInvalidaError');

    const out = await llega(webhook({ type: 'text', text: { body: 'eco' } }, { direction: 'outbound' }), 'mensaje saliente (eco de Kapso)');
    ok(out.ms.length === 0 && out.nuevos.length === 0, 'se ignora');

    let r = await llega(webhook({ type: 'text', text: { body: 'hola' } }), 'número desconocido dice "hola"');
    ok(r.nuevos.some((e) => e.texto.includes('código')), 'pide el código');

    r = await llega(webhook({ type: 'text', text: { body: 'PEPE-ZZ-99' } }), 'código que no existe');
    ok(r.nuevos.some((e) => e.texto.includes('no encontré')), 'avisa que no existe');

    const reqCodigo = webhook({ type: 'text', text: { body: `mi código es ${CODIGO.toLowerCase()}` } });
    const copia = reqCodigo.clone();
    r = await llega(reqCodigo, 'manda su código (en minúsculas)');
    ok(r.nuevos[0]?.texto.startsWith('¡Listo,') === true, 'bienvenida con su nombre');
    ok(r.nuevos.length === 1 && r.nuevos[0]!.texto.includes('1/2 + 1/3'), 'y Pepe plantea el reto en el mismo mensaje');

    r = await llega(copia, 'Kapso reenvía el mismo webhook');
    ok(r.nuevos.length === 0, 'duplicado: no contesta dos veces');

    r = await llega(webhook({ type: 'text', text: { body: 'sí, está bien' } }), 'acepta el error de Pepe');
    const conBotones = r.nuevos.at(-1);
    ok(!!conBotones?.botones?.length, 'la última burbuja trae botones');

    if (conBotones?.botones?.length) {
      const b = conBotones.botones[1] ?? conBotones.botones[0]!;
      r = await llega(webhook({ type: 'interactive', interactive: { type: 'button_reply', button_reply: { id: 'op2', title: b } } }), `toca el botón "${b}"`);
      ok(r.nuevos.length > 0, 'Pepe sigue');
    }

    if (audioPath) {
      r = await llega(webhook({ type: 'audio', audio: { id: 'media-prueba', mime_type: 'audio/mp4' } }), 'manda nota de voz');
      ok(r.nuevos.length > 0 && !r.nuevos.some((e) => e.texto.includes('No te escuché')), 'la transcribe y Pepe contesta');
    }

    r = await llega(webhook({ type: 'text', text: { body: 'ya dime la respuesta' } }), 'pide la respuesta');
    ok(!r.nuevos.some((e) => /5\s*\/\s*6|cinco sextos/i.test(e.texto)), 'no revela 5/6');

    const { data: antes } = await sb.from('sesiones').select('nivel,paso,version').eq('alumno_id', alumnoId).neq('fase', 'terminado').single();
    r = await llega(webhook({ type: 'sticker', sticker: { id: 's1' } }), 'manda un sticker');
    const { data: despues } = await sb.from('sesiones').select('nivel,paso,version').eq('alumno_id', alumnoId).neq('fase', 'terminado').single();
    ok(r.nuevos.length === 1 && r.nuevos[0]!.texto.includes('nota de voz'), 'pide texto o voz');
    ok(JSON.stringify(antes) === JSON.stringify(despues), 'y no cambia la sesión');

    r = await llega(webhook({ type: 'text', text: { body: CODIGO } }, { de: TEL_OTRO }), 'otro número intenta usar el mismo código');
    ok(r.nuevos.some((e) => e.texto.includes('ya está conectado')), 'lo rechaza');

    // Privacidad
    const { data: al } = await sb.from('alumnos').select('*').eq('id', alumnoId).single();
    const fila = JSON.stringify(al);
    ok(!fila.includes(TEL) && !fila.includes('5500000001'), 'el teléfono no está en claro en la fila del alumno');
    ok(al.tel_hash === hashTelefono(TEL), 'tel_hash coincide');
    ok(descifrarTelefono(al.tel_cifrado) === normalizarTelefono(TEL), 'tel_cifrado se descifra al teléfono (formato 52 + 10)');
    const { data: ses } = await sb.from('sesiones').select('id,nivel,paso,fase,canal').eq('alumno_id', alumnoId);
    const { data: tur } = await sb.from('turnos').select('texto,tipo,mensaje_externo_id').in('sesion_id', ses!.map((s) => s.id));
    ok(!JSON.stringify(tur).includes(TEL), 'el teléfono no aparece en los turnos');
    ok((tur ?? []).some((t) => t.tipo === 'audio') === !!audioPath, 'el audio se guarda solo como texto transcrito');
    console.log('\n  sesión:', JSON.stringify(ses), '· turnos:', tur?.length);
    ok(enviados.every((e) => e.texto.length <= 4096) && enviados.filter((e) => e.botones).every((e) => e.botones!.length <= 3 && e.botones!.every((b) => b.length <= 20)), 'límites de WhatsApp (texto y botones)');
  } finally {
    await limpiar();
    console.log('\nlimpieza hecha');
  }
}
main();
