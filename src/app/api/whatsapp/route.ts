/**
 * Webhook de WhatsApp (Kapso o Twilio, según CANAL_WHATSAPP).
 *
 * 1. Verifica la firma (401 si no es válida).
 * 2. Responde 200 DE INMEDIATO, para que el proveedor no reintente y Pepe no
 *    conteste doble.
 * 3. Procesa después con `after()`; la idempotencia por id de mensaje evita
 *    procesar dos veces si aun así llega repetido.
 *
 * En Vercel, el webhook tiene que apuntar al dominio de PRODUCCIÓN: los
 * deployments de preview tienen protección y responden 401.
 */
import { after } from 'next/server';
import { canalWhatsApp } from '@/canales';
import { atenderMensaje } from '@/canales/atender';
import { FirmaInvalidaError, type MensajeEntrante } from '@/canales/tipos';
import { cifrarTelefono, hashTelefono } from '@/lib/telefono';
import { dependenciasMotor } from '@/motor/servidor';

export const maxDuration = 60;

export async function POST(req: Request) {
  let canal;
  try {
    canal = canalWhatsApp();
  } catch (err) {
    console.error('[whatsapp] canal sin configurar:', err);
    return new Response('Canal sin configurar', { status: 503 });
  }

  let mensajes: MensajeEntrante[];
  try {
    mensajes = await canal.parsearEntrante(req);
  } catch (err) {
    if (err instanceof FirmaInvalidaError) return new Response('Firma inválida', { status: 401 });
    console.error('[whatsapp] no se pudo leer el webhook:', err);
    // 200 para que no reintente un cuerpo que nunca vamos a poder leer.
    return new Response('ok');
  }

  if (mensajes.length > 0) {
    after(async () => {
      const deps = {
        canal,
        motor: dependenciasMotor(),
        hashTelefono: (t: string) => hashTelefono(t),
        cifrarTelefono: (t: string) => cifrarTelefono(t),
      };
      // En orden, para que dos mensajes seguidos del mismo alumno no se crucen.
      for (const m of mensajes) await atenderMensaje(deps, m);
    });
  }

  return canal.nombre === 'twilio'
    ? new Response('<Response/>', { headers: { 'Content-Type': 'text/xml' } })
    : new Response('ok');
}
