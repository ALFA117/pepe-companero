import { z } from 'zod';

/**
 * Variables de entorno, validadas la primera vez que se usan (no al importar),
 * para que `next build` y los scripts no truenen por una llave que esa parte
 * no necesita. Cada módulo pide lo suyo con `exigir('NOMBRE')`.
 *
 * Sin Supabase configurado, la app usa una base en memoria (útil en local).
 */
const opcional = z.string().optional();
/** Formato "proveedor:modelo", p. ej. "groq:openai/gpt-oss-20b". */
const idModelo = z.string().regex(/^(groq|google|anthropic):.+$/, 'Usa el formato proveedor:modelo (groq, google o anthropic)');

const EnvSchema = z.object({
  GROQ_API_KEY: opcional,
  GOOGLE_GENERATIVE_AI_API_KEY: opcional,
  ANTHROPIC_API_KEY: opcional,
  MODEL_PEPE: idModelo.default('groq:openai/gpt-oss-20b'),
  MODEL_JUEZ: idModelo.default('groq:openai/gpt-oss-120b'),
  MODEL_RESPALDO: idModelo.optional(),
  /** Modelo de voz a texto de Groq. */
  MODEL_STT: z.string().default('whisper-large-v3-turbo'),

  NEXT_PUBLIC_SUPABASE_URL: z.url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: opcional,

  CANAL_WHATSAPP: z.enum(['kapso', 'twilio']).default('kapso'),
  KAPSO_API_KEY: opcional,
  KAPSO_WEBHOOK_SECRET: opcional,
  KAPSO_PHONE_NUMBER_ID: opcional,
  TWILIO_ACCOUNT_SID: opcional,
  TWILIO_AUTH_TOKEN: opcional,
  TWILIO_WHATSAPP_FROM: opcional,

  TEL_HASH_SALT: z.string().min(16, 'Usa al menos 16 caracteres (openssl rand -hex 32)').optional(),
  TEL_CIFRADO_KEY: z
    .string()
    .refine((v) => Buffer.from(v, 'base64').length === 32, 'Debe ser de 32 bytes en base64 (openssl rand -base64 32)')
    .optional(),
  DOCENTE_PIN: z.string().min(4, 'Usa al menos 4 caracteres').optional(),
});

export type Env = z.infer<typeof EnvSchema>;

let cache: Env | undefined;

export function env(): Env {
  if (cache) return cache;
  // Una variable vacía en .env cuenta como no definida.
  const limpias = Object.fromEntries(
    Object.entries(process.env).map(([k, v]) => [k, v === '' ? undefined : v]),
  );
  const r = EnvSchema.safeParse(limpias);
  if (!r.success) {
    const errores = r.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Variables de entorno inválidas (revisa .env.local):\n${errores}`);
  }
  cache = r.data;
  return cache;
}

export class FaltaVariableError extends Error {
  constructor(readonly nombre: string) {
    super(`Falta la variable de entorno ${nombre} (revisa .env.local)`);
    this.name = 'FaltaVariableError';
  }
}

/** Devuelve una variable obligatoria para esa parte del sistema o lanza un error claro. */
export function exigir<K extends keyof Env>(nombre: K): NonNullable<Env[K]> {
  const v = env()[nombre];
  if (v === undefined || v === null || v === '') throw new FaltaVariableError(nombre);
  return v as NonNullable<Env[K]>;
}

const LLAVE_DE: Record<string, keyof Env> = {
  groq: 'GROQ_API_KEY',
  google: 'GOOGLE_GENERATIVE_AI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
};

/** ¿Está la llave del proveedor de este modelo? */
export function hayLlavePara(idModelo: string): boolean {
  const llave = LLAVE_DE[idModelo.split(':')[0] ?? ''];
  return llave !== undefined && Boolean(env()[llave]);
}

export function hayLLM(): boolean {
  const e = env();
  return hayLlavePara(e.MODEL_PEPE) && hayLlavePara(e.MODEL_JUEZ);
}

export function haySupabase(): boolean {
  const e = env();
  return Boolean(e.NEXT_PUBLIC_SUPABASE_URL && e.SUPABASE_SERVICE_ROLE_KEY);
}

export function hayTranscripcion(): boolean {
  return Boolean(env().GROQ_API_KEY);
}

/** Solo para tests: olvida la configuración leída. */
export function reiniciarEnvParaTests(): void {
  cache = undefined;
}
