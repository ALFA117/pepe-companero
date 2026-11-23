import 'server-only';
/**
 * Arma las dependencias reales del motor para las rutas del servidor.
 * - Con Supabase configurado usa la base real; si no, la base en memoria.
 * - Sin llaves de LLM, el Juez y Pepe usan sus respaldos (la app sigue
 *   funcionando con los `ejemplo` de los retos).
 */
import { db } from '@/db/cliente';
import { repositorioMemoriaGlobal, sembrarDemo } from '@/db/memoria';
import { generarDemo } from '@/demo/generar';
import type { Repositorio } from '@/db/repositorio';
import { RepositorioSupabase } from '@/db/supabase';
import type { GenerarJSON } from '@/ia/llm';
import { generarJSON } from '@/ia/modelos';
import { transcribirConGroq } from '@/ia/transcribir';
import { hayLLM, haySupabase, hayTranscripcion } from '@/lib/env';
import { listarRetos } from '@/retos/cargar';
import type { DependenciasMotor } from './procesar';

const sinLLM: GenerarJSON = async () => {
  throw new Error('No hay llaves de LLM configuradas');
};

let repo: Repositorio | undefined;

export function repositorio(): Repositorio {
  // En memoria (solo local) se siembra el grupo de demo para que el panel se vea lleno.
  repo ??= haySupabase()
    ? new RepositorioSupabase(db())
    : repositorioMemoriaGlobal((datos) => sembrarDemo(datos, generarDemo({ banco: listarRetos() })));
  return repo;
}

export function dependenciasMotor(): DependenciasMotor {
  return {
    repo: repositorio(),
    generar: hayLLM() ? generarJSON : sinLLM,
    transcribir: hayTranscripcion() ? transcribirConGroq : undefined,
    banco: listarRetos(),
  };
}
