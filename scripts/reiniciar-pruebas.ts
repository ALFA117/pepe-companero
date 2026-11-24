/**
 * Deja el grupo de pruebas "1° B (pruebas)" (PEPE-1B-01 a 03) como nuevo
 * antes de una demo: borra sus sesiones (y en cascada turnos, evaluaciones y
 * fluidez). No toca el grupo de demo de 45 alumnos.
 *
 *   pnpm reiniciar-pruebas                 # conserva los teléfonos vinculados
 *   pnpm reiniciar-pruebas --desvincular   # también desvincula WhatsApp
 */
import { createClient } from '@supabase/supabase-js';
import { exigir } from '../src/lib/env';

try {
  process.loadEnvFile('.env.local');
} catch {
  // nada
}

const GRUPO_PRUEBAS = '00000000-0000-0000-0000-000000000001';

async function main() {
  const sb = createClient(exigir('NEXT_PUBLIC_SUPABASE_URL'), exigir('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false },
  });
  const { data: alumnos, error } = await sb.from('alumnos').select('id,codigo').eq('grupo_id', GRUPO_PRUEBAS);
  if (error) throw new Error(error.message);
  const ids = (alumnos ?? []).map((a) => a.id);
  if (ids.length === 0) {
    console.log('No hay alumnos en el grupo de pruebas (¿corriste supabase/seed.sql?).');
    return;
  }
  const { error: e1, count } = await sb.from('sesiones').delete({ count: 'exact' }).in('alumno_id', ids);
  if (e1) throw new Error(e1.message);
  console.log(`Sesiones borradas: ${count ?? 0} (${alumnos!.map((a) => a.codigo).join(', ')})`);
  if (process.argv.includes('--desvincular')) {
    const { error: e2 } = await sb
      .from('alumnos')
      .update({ tel_hash: null, tel_cifrado: null, ultimo_mensaje_wa_en: null })
      .in('id', ids);
    if (e2) throw new Error(e2.message);
    console.log('Teléfonos desvinculados.');
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
