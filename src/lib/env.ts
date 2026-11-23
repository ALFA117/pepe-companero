import 'server-only';
import { z } from 'zod';

/**
 * Variables de entorno del servidor, validadas la primera vez que se usan
 * (no al importar), para que `next build` no truene si falta una llave que
 * esa ruta no necesita.
 */
const EnvSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1),
  MODEL_PEPE: z.string().min(1).default('claude-haiku-5-5'),
  MODEL_JUEZ: z.string().min(1).default('claude-sonnet-5-5'),
  OPENAI_API_KEY: z.string().min(1),

  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  CANAL_WHATSAPP: z.enum(['kapso', 'twilio']).default('kapso'),
  KAPSO_API_KEY: z.string().optional(),
  KAPSO_WEBHOOK_SECRET: z.string().optional(),
  KAPSO_PHONE_NUMBER_ID: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_WHATSAPP_FROM: z.string().optional(),

  TEL_HASH_SALT: z.string().min(16),
  TEL_CIFRADO_KEY: z
    .string()
    .refine((v) => Buffer.from(v, 'base64').length === 32, 'Debe ser de 32 bytes en base64'),
  DOCENTE_PIN: z.string().min(4),
});

export type Env = z.infer<typeof EnvSchema>;

let cache: Env | undefined;

export function env(): Env {
  if (cache) return cache;
  const vacias = Object.fromEntries(
    Object.entries(process.env).map(([k, v]) => [k, v === '' ? undefined : v]),
  );
  const r = EnvSchema.safeParse(vacias);
  if (!r.success) {
    const faltan = r.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Variables de entorno inválidas (revisa .env.local):\n${faltan}`);
  }
  cache = r.data;
  return cache;
}
