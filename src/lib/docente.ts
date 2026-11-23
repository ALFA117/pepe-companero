import 'server-only';
/**
 * Acceso al panel con un PIN simple (DOCENTE_PIN). La cookie guarda un hash
 * del PIN, no el PIN; si el PIN cambia, todas las sesiones se invalidan.
 */
import { createHash, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { env } from './env';

export const COOKIE_DOCENTE = 'pepe_docente';
const DURACION_S = 12 * 3600;

function token(pin: string): string {
  return createHash('sha256').update(`pepe-docente:${pin}`).digest('hex');
}

function iguales(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function pinConfigurado(): boolean {
  return Boolean(env().DOCENTE_PIN);
}

export function pinCorrecto(pin: string): boolean {
  const real = env().DOCENTE_PIN;
  return Boolean(real) && iguales(pin.trim(), real!);
}

export async function abrirSesionDocente(): Promise<void> {
  (await cookies()).set(COOKIE_DOCENTE, token(env().DOCENTE_PIN!), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: DURACION_S,
    path: '/',
  });
}

export async function cerrarSesionDocente(): Promise<void> {
  (await cookies()).delete(COOKIE_DOCENTE);
}

export async function esDocente(): Promise<boolean> {
  const real = env().DOCENTE_PIN;
  if (!real) return false;
  const valor = (await cookies()).get(COOKIE_DOCENTE)?.value;
  return Boolean(valor) && iguales(valor!, token(real));
}

/** Para páginas y acciones del panel: manda a /docente/entrar si no hay sesión. */
export async function exigirDocente(): Promise<void> {
  if (!(await esDocente())) redirect('/docente/entrar');
}
