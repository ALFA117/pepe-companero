import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { exigir } from '@/lib/env';

/**
 * Cliente de Supabase con la service role key.
 * SOLO servidor: `server-only` hace que el build falle si un componente de
 * cliente lo importa. Las tablas tienen RLS sin políticas, así que esta es la
 * única forma de leerlas o escribirlas.
 */
let cliente: SupabaseClient | undefined;

export function db(): SupabaseClient {
  cliente ??= createClient(exigir('NEXT_PUBLIC_SUPABASE_URL'), exigir('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cliente;
}
