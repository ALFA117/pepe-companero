/**
 * Interfaz común de los canales de mensajería (Kapso, Twilio y, más adelante,
 * el peluche con ESP32). El motor no sabe por cuál canal llegó un mensaje.
 */

export type MensajeEntrante = {
  /** ID del mensaje en el proveedor. Se guarda en `turnos.mensaje_externo_id` (idempotencia). */
  id_externo: string;
  /** Teléfono del remitente tal como lo manda el proveedor. Solo vive en memoria. */
  de: string;
} & (
  | { tipo: 'texto'; texto: string }
  | { tipo: 'boton'; texto: string; boton_id: string }
  | { tipo: 'audio'; media_id: string; mime: string | null }
);

export interface Canal {
  readonly nombre: string;
  /**
   * Verifica la firma y convierte el webhook en mensajes.
   * Devuelve un arreglo porque algunos proveedores mandan lotes (batch);
   * un arreglo vacío significa "no hay nada que procesar".
   * Lanza `FirmaInvalidaError` si la firma no es válida.
   */
  parsearEntrante(req: Request): Promise<MensajeEntrante[]>;
  enviarTexto(destino: string, texto: string): Promise<void>;
  /** ≤ 3 botones de ≤ 20 caracteres. */
  enviarBotones(destino: string, texto: string, botones: string[]): Promise<void>;
  descargarAudio?(mediaId: string): Promise<{ audio: ArrayBuffer; mime: string }>;
  /** Marca como leído y muestra "escribiendo…", si el proveedor lo permite. */
  indicarEscribiendo?(destino: string, idExterno: string): Promise<void>;
}

export class FirmaInvalidaError extends Error {
  constructor() {
    super('Firma del webhook inválida');
    this.name = 'FirmaInvalidaError';
  }
}
