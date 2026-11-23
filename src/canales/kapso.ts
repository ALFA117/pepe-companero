/**
 * Canal de WhatsApp con Kapso.
 *
 * Webhook (evento `whatsapp.message.received`, formato de Kapso):
 *   - Firma: header `X-Webhook-Signature` = HMAC-SHA256 hex del cuerpo crudo.
 *   - Evento: header `X-Webhook-Event`.
 *   - Lote: si el buffering está activo, llega `{ batch: true, data: [...] }`.
 * Envío y media: SDK `@kapso/whatsapp-cloud-api` por el proxy de Kapso.
 */
import { WhatsAppClient } from '@kapso/whatsapp-cloud-api';
import { verifyKapsoWebhookSignature } from '@kapso/whatsapp-cloud-api/server';
import { z } from 'zod';
import { FirmaInvalidaError, type Canal, type MensajeEntrante } from './tipos';

export const EVENTO_MENSAJE = 'whatsapp.message.received';
const URL_KAPSO = 'https://api.kapso.ai/meta/whatsapp';

const MensajeKapso = z
  .object({
    id: z.string(),
    from: z.string().optional(),
    type: z.string(),
    text: z.object({ body: z.string() }).optional(),
    interactive: z
      .object({
        type: z.string(),
        button_reply: z.object({ id: z.string(), title: z.string() }).optional(),
        list_reply: z.object({ id: z.string(), title: z.string() }).optional(),
      })
      .optional(),
    button: z.object({ text: z.string(), payload: z.string().optional() }).optional(),
    audio: z.object({ id: z.string(), mime_type: z.string().optional() }).optional(),
    kapso: z
      .object({
        direction: z.string().optional(),
        media_data: z.object({ content_type: z.string().optional() }).partial().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

const EventoKapso = z
  .object({
    message: MensajeKapso,
    conversation: z.object({ phone_number: z.string().optional() }).passthrough().optional(),
    phone_number_id: z.string().optional(),
  })
  .passthrough();

const Cuerpo = z.union([
  z.object({ batch: z.literal(true), data: z.array(z.unknown()) }).passthrough(),
  z.unknown(),
]);

/** Convierte un evento de Kapso a nuestro formato; null si no hay que procesarlo. */
export function mensajeDesdeEvento(evento: unknown): MensajeEntrante | null {
  const r = EventoKapso.safeParse(evento);
  if (!r.success) return null;
  const { message: m, conversation } = r.data;
  if (m.kapso?.direction === 'outbound') return null;
  const de = m.from ?? conversation?.phone_number;
  if (!de) return null;
  const base = { id_externo: m.id, de };

  if (m.type === 'text' && m.text) return { ...base, tipo: 'texto', texto: m.text.body };
  if (m.type === 'interactive') {
    const resp = m.interactive?.button_reply ?? m.interactive?.list_reply;
    if (resp) return { ...base, tipo: 'boton', texto: resp.title, boton_id: resp.id };
  }
  if (m.type === 'button' && m.button) {
    return { ...base, tipo: 'boton', texto: m.button.text, boton_id: m.button.payload ?? m.button.text };
  }
  if ((m.type === 'audio' || m.type === 'voice') && m.audio) {
    return {
      ...base,
      tipo: 'audio',
      media_id: m.audio.id,
      mime: m.audio.mime_type ?? m.kapso?.media_data?.content_type ?? null,
    };
  }
  // Imagen, sticker, ubicación…: Pepe solo entiende texto y voz.
  return { ...base, tipo: 'texto', texto: `[mandó un mensaje de tipo ${m.type}]` };
}

export interface ConfigKapso {
  apiKey: string;
  phoneNumberId: string;
  webhookSecret: string;
}

export class CanalKapso implements Canal {
  readonly nombre = 'kapso';
  private readonly cliente: WhatsAppClient;

  constructor(private readonly config: ConfigKapso, cliente?: WhatsAppClient) {
    this.cliente = cliente ?? new WhatsAppClient({ baseUrl: URL_KAPSO, kapsoApiKey: config.apiKey });
  }

  async parsearEntrante(req: Request): Promise<MensajeEntrante[]> {
    const crudo = await req.text();
    const firma = req.headers.get('x-webhook-signature') ?? undefined;
    if (!verifyKapsoWebhookSignature({ secret: this.config.webhookSecret, rawBody: crudo, signatureHeader: firma })) {
      throw new FirmaInvalidaError();
    }
    const evento = req.headers.get('x-webhook-event');
    if (evento && evento !== EVENTO_MENSAJE) return [];

    let json: unknown;
    try {
      json = JSON.parse(crudo);
    } catch {
      return [];
    }
    const cuerpo = Cuerpo.parse(json) as { batch?: boolean; data?: unknown[] };
    const eventos = cuerpo.batch === true && Array.isArray(cuerpo.data) ? cuerpo.data : [json];
    return eventos.map(mensajeDesdeEvento).filter((m): m is MensajeEntrante => m !== null);
  }

  async enviarTexto(destino: string, texto: string): Promise<void> {
    await this.cliente.messages.sendText({ phoneNumberId: this.config.phoneNumberId, to: destino, body: texto });
  }

  async enviarBotones(destino: string, texto: string, botones: string[]): Promise<void> {
    await this.cliente.messages.sendInteractiveButtons({
      phoneNumberId: this.config.phoneNumberId,
      to: destino,
      bodyText: texto,
      buttons: botones.slice(0, 3).map((b, i) => ({ id: `op${i + 1}`, title: b.slice(0, 20) })),
    });
  }

  async descargarAudio(mediaId: string): Promise<{ audio: ArrayBuffer; mime: string }> {
    const audio = (await this.cliente.media.download({
      mediaId,
      phoneNumberId: this.config.phoneNumberId,
    })) as ArrayBuffer;
    return { audio, mime: 'audio/ogg' };
  }

  async indicarEscribiendo(_destino: string, idExterno: string): Promise<void> {
    await this.cliente.messages.markRead({
      phoneNumberId: this.config.phoneNumberId,
      messageId: idExterno,
      typingIndicator: { type: 'text' },
    });
  }
}
