/**
 * Siembra el grupo de demo "1° B" (45 alumnos y una semana de sesiones) en
 * Supabase. Borra antes el grupo de demo anterior (en cascada), así que se
 * puede correr varias veces.
 *
 *   pnpm seed-demo
 *
 * Necesita NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY, y que ya se
 * hayan corrido las migraciones (incluida la de permisos).
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { generarDemo, GRUPO_DEMO_ID } from '../src/demo/generar';
import { exigir } from '../src/lib/env';
import { listarRetos } from '../src/retos/cargar';

try {
  process.loadEnvFile('.env.local');
} catch {
  // nada
}

async function insertarPorLotes(sb: SupabaseClient, tabla: string, filas: object[], lote = 500) {
  for (let i = 0; i < filas.length; i += lote) {
    const { error } = await sb.from(tabla).insert(filas.slice(i, i + lote) as never);
    if (error) throw new Error(`${tabla}: ${error.message}`);
  }
  console.log(`  ${tabla}: ${filas.length}`);
}

async function main() {
  const sb = createClient(exigir('NEXT_PUBLIC_SUPABASE_URL'), exigir('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false },
  });
  const demo = generarDemo({ banco: listarRetos() });

  console.log('Borrando el grupo de demo anterior…');
  const { error } = await sb.from('grupos').delete().eq('id', GRUPO_DEMO_ID);
  if (error) throw new Error(`grupos: ${error.message}`);

  console.log('Insertando:');
  await insertarPorLotes(sb, 'grupos', [demo.grupo]);
  await insertarPorLotes(sb, 'alumnos', demo.alumnos);
  await insertarPorLotes(sb, 'sesiones', demo.sesiones);
  await insertarPorLotes(sb, 'turnos', demo.turnos);
  await insertarPorLotes(
    sb,
    'evaluaciones',
    demo.evaluaciones.map((e) => ({ ...e })),
  );
  await insertarPorLotes(
    sb,
    'evaluaciones_finales',
    demo.evaluaciones_finales.map(({ sesion_id, resuelto, nivel_ayuda_maximo, creado_en, ...resto }) => ({
      sesion_id,
      resuelto,
      nivel_ayuda_maximo,
      creado_en,
      juez: { resuelto, nivel_ayuda_maximo, ...resto },
    })),
  );
  await insertarPorLotes(sb, 'fluidez', demo.fluidez);
  console.log('Listo ✅');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
