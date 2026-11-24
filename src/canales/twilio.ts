/**
 * Canal de respaldo: WhatsApp por el Sandbox de Twilio.
 * - Webhook: application/x-www-form-urlencoded, firmado con `X-Twilio-Signature`
 *   (HMAC-SHA1 en base64 de la URL + parámetros ordenados, con el Auth Token).
 * - Twilio no tiene botones nativos en el sandbox: se mandan como opciones en
 *   el texto y el alumno escribe la opción.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { FirmaInvalidaError, type Canal, type MensajeEntrante } from './tipos';

export interface ConfigTwilio {
  accountSid: string;
  authToken: string;
  /** "whatsapp:+14155238886" en el sandbox. */
  desde: string;
  /** URL pública exacta del webhook (la firma depende de ella). */
  urlWebhook?: string;
}

export function firmaTwilio(authToken: string, url: string, params: Record<string, string>): string {
  const datos = Object.keys(params)
    .sort()
    .reduce((acc, k) => acc + k + params[k], url);
  return createHmac('sha1', authToken).update(Buffer.from(datos, 'utf8')).digest('base64');
}

export function textoConOpciones(texto: string, botones: string[]): string {
  return `${texto}\n\n${botones.map((b) => `• ${b}`).join('\n')}\n(Escribe tu opción)`;
}

const conWhatsApp = (tel: string) => (tel.startsWith('whatsapp:') ? tel : `whatsapp:+${tel.replace(/\D/g, '')}`);

export class CanalTwilio implements Canal {
  readonly nombre = 'twilio';

  constructor(private readonly config: ConfigTwilio) {}

  private get auth() {
    return `Basic ${Buffer.from(`${this.config.accountSid}:${this.config.authToken}`).toString('base64')}`;
  }

  async parsearEntrante(req: Request): Promise<MensajeEntrante[]> {
    const crudo = await req.text();
    const params = Object.fromEntries(new URLSearchParams(crudo));
    const esperada = firmaTwilio(this.config.authToken, this.config.urlWebhook ?? req.url, params);
    const recibida = req.headers.get('x-twilio-signature') ?? '';
    const a = Buffer.from(esperada);
    const b = Buffer.from(recibida);
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw new FirmaInvalidaError();

    const id = params.MessageSid;
    const de = params.From;
    if (!id || !de) return [];
    const base = { id_externo: id, de };
    if (Number(params.NumMedia ?? 0) > 0 && params.MediaContentType0?.startsWith('audio/') && params.MediaUrl0) {
      return [{ ...base, tipo: 'audio', media_id: params.MediaUrl0, mime: params.MediaContentType0 }];
    }
    const cuerpo = (params.Body ?? '').trim();
    if (cuerpo === '') {
      const descripcion = Number(params.NumMedia ?? 0) > 0 ? (params.MediaContentType0 ?? 'media') : 'vacio';
      return [{ ...base, tipo: 'otro', descripcion }];
    }
    return [{ ...base, tipo: 'texto', texto: cuerpo }];
  }

  private async enviar(destino: string, cuerpo: string): Promise<void> {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${this.config.accountSid}/Messages.json`, {
      method: 'POST',
      headers: { Authorization: this.auth, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ From: this.config.desde, To: conWhatsApp(destino), Body: cuerpo }),
    });
    // Sin el cuerpo de la respuesta: los errores de Twilio incluyen el número destino.
    if (!res.ok) throw new Error(`Twilio respondió ${res.status} al enviar`);
  }

  enviarTexto(destino: string, texto: string): Promise<void> {
    return this.enviar(destino, texto);
  }

  enviarBotones(destino: string, texto: string, botones: string[]): Promise<void> {
    return this.enviar(destino, textoConOpciones(texto, botones));
  }

  /** En Twilio el "media id" es la URL del archivo (requiere autenticación). */
  async descargarAudio(url: string): Promise<{ audio: ArrayBuffer; mime: string }> {
    if (!url.startsWith('https://api.twilio.com/')) throw new Error('URL de media de Twilio inesperada');
    const res = await fetch(url, { headers: { Authorization: this.auth } });
    if (!res.ok) throw new Error(`Twilio media ${res.status}`);
    return { audio: await res.arrayBuffer(), mime: res.headers.get('content-type') ?? 'audio/ogg' };
  }
}
