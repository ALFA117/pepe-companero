/**
 * Privacidad de menores: el teléfono NUNCA se guarda en claro.
 *   - hashTelefono: SHA-256 con sal, para encontrar al alumno cuando escribe.
 *   - cifrarTelefono: AES-256-GCM, solo para poder escribirle ("Asignar reto").
 * Las llaves vienen de TEL_HASH_SALT y TEL_CIFRADO_KEY (o se pasan en tests).
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { exigir } from './env';

/**
 * Solo dígitos (WhatsApp manda "5215512345678"; Twilio "whatsapp:+5215512345678").
 * Celulares de México: WhatsApp los manda a veces como 521 + 10 dígitos y a
 * veces como 52 + 10. Se guardan siempre como 52 + 10 para que el mismo
 * alumno se encuentre con cualquiera de los dos (y Meta acepta ese formato
 * para enviar).
 */
export function normalizarTelefono(tel: string): string {
  const d = tel.replace(/\D/g, '');
  return /^521\d{10}$/.test(d) ? `52${d.slice(3)}` : d;
}

export function hashTelefono(tel: string, sal = exigir('TEL_HASH_SALT')): string {
  return createHash('sha256').update(`${sal}:${normalizarTelefono(tel)}`).digest('hex');
}

const VERSION = 'v1';

function llave(base64?: string): Buffer {
  const k = Buffer.from(base64 ?? exigir('TEL_CIFRADO_KEY'), 'base64');
  if (k.length !== 32) throw new Error('TEL_CIFRADO_KEY debe ser de 32 bytes en base64');
  return k;
}

/** Devuelve "v1:iv:tag:cifrado" (base64). */
export function cifrarTelefono(tel: string, llaveBase64?: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', llave(llaveBase64), iv);
  const cifrado = Buffer.concat([c.update(normalizarTelefono(tel), 'utf8'), c.final()]);
  return [VERSION, iv.toString('base64'), c.getAuthTag().toString('base64'), cifrado.toString('base64')].join(':');
}

export function descifrarTelefono(valor: string, llaveBase64?: string): string {
  const [version, iv, tag, cifrado] = valor.split(':');
  if (version !== VERSION || !iv || !tag || !cifrado) throw new Error('Teléfono cifrado con formato desconocido');
  const d = createDecipheriv('aes-256-gcm', llave(llaveBase64), Buffer.from(iv, 'base64'));
  d.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([d.update(Buffer.from(cifrado, 'base64')), d.final()]).toString('utf8');
}
