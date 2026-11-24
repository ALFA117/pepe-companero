/**
 * Prueba de integración contra el Supabase real (usa el alumno PEPE-1B-03 y
 * borra sus sesiones al terminar). No usa el LLM.
 *
 *   pnpm probar-supabase
 */
import { createClient } from '@supabase/supabase-js';
import { RepositorioSupabase } from '../src/db/supabase';
import { SesionActivaDuplicadaError } from '../src/db/repositorio';
import { procesar } from '../src/motor/procesar';
import { crearSesion } from '../src/motor/maquina';
import { listarRetos } from '../src/retos/cargar';
process.loadEnvFile('.env.local');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const repo = new RepositorioSupabase(sb);
const banco = listarRetos();
const sinLLM = async () => { throw new Error('sin llm'); };
const ok = (c: boolean, m: string) => { console.log((c ? 'OK   ' : 'FALLA') + ' ' + m); if (!c) process.exitCode = 1; };

async function main() {
const alumno = (await repo.alumnoPorCodigo('PEPE-1B-03'))!;
ok(!!alumno, 'alumnoPorCodigo PEPE-1B-03');
await sb.from('sesiones').delete().eq('alumno_id', alumno.id);
try {
  const reto = banco.find((r) => r.id === 'mate-suma-fracciones-01')!;
  const a = crearSesion({ id: crypto.randomUUID(), alumno_id: alumno.id, reto, canal: 'web', pendiente: true });
  await repo.insertarSesion(a.sesion);
  const b = crearSesion({ id: crypto.randomUUID(), alumno_id: alumno.id, reto, canal: 'web', pendiente: true });
  let dup = false;
  try { await repo.insertarSesion(b.sesion); } catch (e) { dup = e instanceof SesionActivaDuplicadaError; if (!dup) console.log(e); }
  ok(dup, 'segunda sesión activa → SesionActivaDuplicadaError');

  const s0 = (await repo.sesionActiva(alumno.id))!;
  const s1 = await repo.actualizarSesion(s0, { ...s0, nivel: 1, nivel_max: 1 });
  ok(s1?.version === s0.version + 1, 'actualizarSesion sube version');
  const s2 = await repo.actualizarSesion(s0, { ...s0, nivel: 2, nivel_max: 2 });
  ok(s2 === null, 'actualizarSesion con version vieja → null');
  let rechazo = false;
  try { await repo.actualizarSesion(s1!, { ...s1!, nivel: 3, nivel_max: 1 }); } catch { rechazo = true; }
  ok(rechazo, 'check constraint nivel <= nivel_max activa');
  await sb.from('sesiones').delete().eq('alumno_id', alumno.id);

  const deps = { repo, generar: sinLLM, banco };
  const [r1, r2] = await Promise.all([
    procesar(deps, { alumno_id: alumno.id, canal: 'web', entrada: { tipo: 'texto', texto: 'hola' }, mensaje_externo_id: 'it-1' }),
    procesar(deps, { alumno_id: alumno.id, canal: 'web', entrada: { tipo: 'texto', texto: 'hola' }, mensaje_externo_id: 'it-2' }),
  ]);
  const { data: activas } = await sb.from('sesiones').select('id').eq('alumno_id', alumno.id).neq('fase', 'terminado');
  ok(activas?.length === 1, `carrera de primer mensaje → 1 sesión activa (hay ${activas?.length})`);
  ok([r1,r2].filter((r) => r.mensajes.length > 0).length === 1, 'solo el ganador contesta');

  const r3 = await procesar(deps, { alumno_id: alumno.id, canal: 'web', entrada: { tipo: 'texto', texto: 'hola' }, mensaje_externo_id: 'it-1' });
  ok(r3.duplicado === true, 'mismo mensaje_externo_id → duplicado');

  const r4 = await procesar(deps, { alumno_id: alumno.id, canal: 'web', entrada: { tipo: 'texto', texto: 'no sé' }, mensaje_externo_id: 'it-3' });
  ok(r4.mensajes.length > 0, 'respuesta del alumno procesada: ' + JSON.stringify(r4.mensajes[0]).slice(0, 70));
  const ses = (await repo.sesionActiva(alumno.id))!;
  const turnos = await repo.ultimosTurnos(ses.id, 50);
  const { data: evs } = await sb.from('evaluaciones').select('id').eq('sesion_id', ses.id);
  ok(turnos.length >= 4, `turnos guardados: ${turnos.length}`);
  ok(evs?.length === 1, `evaluaciones guardadas: ${evs?.length}`);
  console.log('     sesión:', ses.fase, 'nivel', ses.nivel, 'paso', ses.paso, 'version', ses.version);
} finally {
  await sb.from('sesiones').delete().eq('alumno_id', alumno.id);
  console.log('limpieza hecha');
}
}
main();
