import { createHmac } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { CanalKapso, mensajeDesdeEvento } from './kapso';
import { FirmaInvalidaError } from './tipos';

const SECRETO = 'secreto-de-prueba';

function evento(message: Record<string, unknown>) {
  return {
    message: { id: 'wamid.1', timestamp: '1795400000', from: '5215512345678', kapso: { direction: 'inbound' }, ...message },
    conversation: { id: 'conv-1', phone_number: '5215512345678', phone_number_id: 'pn-1' },
    is_new_conversation: false,
    phone_number_id: 'pn-1',
  };
}

function peticion(cuerpo: unknown, { firma, evento: ev = 'whatsapp.message.received' }: { firma?: string; evento?: string } = {}) {
  const crudo = JSON.stringify(cuerpo);
  return new Request('https://pepe.test/api/whatsapp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Event': ev,
      'X-Webhook-Signature': firma ?? createHmac('sha256', SECRETO).update(crudo).digest('hex'),
    },
    body: crudo,
  });
}

function canal(cliente: unknown = {}) {
  return new CanalKapso({ apiKey: 'k', phoneNumberId: 'pn-1', webhookSecret: SECRETO }, cliente as never);
}

describe('mensajeDesdeEvento', () => {
  it('texto', () => {
    expect(mensajeDesdeEvento(evento({ type: 'text', text: { body: 'hola' } }))).toEqual({
      id_externo: 'wamid.1',
      de: '5215512345678',
      tipo: 'texto',
      texto: 'hola',
    });
  });

  it('respuesta de botón', () => {
    const m = mensajeDesdeEvento(
      evento({ type: 'interactive', interactive: { type: 'button_reply', button_reply: { id: 'op2', title: 'B' } } }),
    );
    expect(m).toMatchObject({ tipo: 'boton', texto: 'B', boton_id: 'op2' });
  });

  it('nota de voz', () => {
    const m = mensajeDesdeEvento(evento({ type: 'audio', audio: { id: 'media-9', mime_type: 'audio/ogg; codecs=opus' } }));
    expect(m).toMatchObject({ tipo: 'audio', media_id: 'media-9', mime: 'audio/ogg; codecs=opus' });
  });

  it('toma el tipo del audio de media_data si no viene en el mensaje', () => {
    const m = mensajeDesdeEvento(
      evento({ type: 'audio', audio: { id: 'm' }, kapso: { direction: 'inbound', media_data: { content_type: 'audio/ogg' } } }),
    );
    expect(m).toMatchObject({ mime: 'audio/ogg' });
  });

  it('ignora los mensajes salientes (los que mandó Pepe)', () => {
    expect(mensajeDesdeEvento(evento({ type: 'text', text: { body: 'x' }, kapso: { direction: 'outbound' } }))).toBeNull();
  });

  it('usa el teléfono de la conversación si falta "from"', () => {
    const e = evento({ type: 'text', text: { body: 'x' } });
    delete (e.message as Record<string, unknown>).from;
    expect(mensajeDesdeEvento(e)?.de).toBe('5215512345678');
  });

  it('otros tipos llegan como texto descriptivo', () => {
    expect(mensajeDesdeEvento(evento({ type: 'image' }))).toMatchObject({ tipo: 'texto', texto: '[mandó un mensaje de tipo image]' });
  });

  it('un cuerpo irreconocible no truena', () => {
    expect(mensajeDesdeEvento({ algo: 1 })).toBeNull();
  });
});

describe('CanalKapso.parsearEntrante', () => {
  it('acepta un webhook con firma válida', async () => {
    const r = await canal().parsearEntrante(peticion(evento({ type: 'text', text: { body: 'hola' } })));
    expect(r).toHaveLength(1);
  });

  it('rechaza una firma inválida', async () => {
    await expect(canal().parsearEntrante(peticion(evento({ type: 'text', text: { body: 'x' } }), { firma: 'abc' }))).rejects.toThrow(
      FirmaInvalidaError,
    );
  });

  it('rechaza un cuerpo alterado después de firmar', async () => {
    const original = JSON.stringify(evento({ type: 'text', text: { body: 'hola' } }));
    const firma = createHmac('sha256', SECRETO).update(original).digest('hex');
    const req = new Request('https://pepe.test', {
      method: 'POST',
      headers: { 'X-Webhook-Signature': firma, 'X-Webhook-Event': 'whatsapp.message.received' },
      body: original.replace('hola', 'adios'),
    });
    await expect(canal().parsearEntrante(req)).rejects.toThrow(FirmaInvalidaError);
  });

  it('ignora otros eventos', async () => {
    const r = await canal().parsearEntrante(peticion(evento({ type: 'text', text: { body: 'x' } }), { evento: 'whatsapp.message.read' }));
    expect(r).toEqual([]);
  });

  it('procesa lotes (buffering)', async () => {
    const lote = {
      batch: true,
      data: [
        evento({ id: 'a', type: 'text', text: { body: '1' } }),
        evento({ id: 'b', type: 'text', text: { body: '2' } }),
      ],
    };
    const r = await canal().parsearEntrante(peticion(lote));
    expect(r.map((m) => m.id_externo)).toEqual(['a', 'b']);
  });
});

describe('CanalKapso envío', () => {
  it('manda botones con máximo 3 de 20 caracteres', async () => {
    const sendInteractiveButtons = vi.fn().mockResolvedValue({});
    await canal({ messages: { sendInteractiveButtons } }).enviarBotones('521', '¿Cuál?', ['A', 'B', 'Las dos están bien', 'D']);
    expect(sendInteractiveButtons).toHaveBeenCalledWith({
      phoneNumberId: 'pn-1',
      to: '521',
      bodyText: '¿Cuál?',
      buttons: [
        { id: 'op1', title: 'A' },
        { id: 'op2', title: 'B' },
        { id: 'op3', title: 'Las dos están bien' },
      ],
    });
  });

  it('marca como leído con indicador de escribiendo', async () => {
    const markRead = vi.fn().mockResolvedValue({});
    await canal({ messages: { markRead } }).indicarEscribiendo('521', 'wamid.1');
    expect(markRead).toHaveBeenCalledWith({ phoneNumberId: 'pn-1', messageId: 'wamid.1', typingIndicator: { type: 'text' } });
  });
});
