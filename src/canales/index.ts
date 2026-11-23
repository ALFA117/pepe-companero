import 'server-only';
import { env, exigir } from '@/lib/env';
import { CanalKapso } from './kapso';
import { CanalTwilio } from './twilio';
import type { Canal } from './tipos';

let canal: Canal | undefined;

/** El canal de WhatsApp activo según CANAL_WHATSAPP (kapso | twilio). */
export function canalWhatsApp(): Canal {
  if (canal) return canal;
  const e = env();
  canal =
    e.CANAL_WHATSAPP === 'twilio'
      ? new CanalTwilio({
          accountSid: exigir('TWILIO_ACCOUNT_SID'),
          authToken: exigir('TWILIO_AUTH_TOKEN'),
          desde: exigir('TWILIO_WHATSAPP_FROM'),
        })
      : new CanalKapso({
          apiKey: exigir('KAPSO_API_KEY'),
          phoneNumberId: exigir('KAPSO_PHONE_NUMBER_ID'),
          webhookSecret: exigir('KAPSO_WEBHOOK_SECRET'),
        });
  return canal;
}
