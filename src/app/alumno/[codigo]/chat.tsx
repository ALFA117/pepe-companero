'use client';

/**
 * Chat del alumno con Pepe, estilo WhatsApp y pensado primero para celular.
 * Los botones de Pepe aparecen como chips; el micrófono graba una nota de voz
 * con MediaRecorder que pasa por la misma transcripción que WhatsApp.
 */
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import type { RespuestaChat } from '@/app/api/chat/route';

export interface MensajeChat {
  id: string;
  rol: 'alumno' | 'pepe' | 'sistema';
  texto: string;
  tipo?: 'texto' | 'audio' | 'boton';
  /** Si falló el envío, se puede reintentar. */
  reintentar?: () => void;
}

interface Props {
  codigo: string;
  nombre: string;
  historial: MensajeChat[];
  botonesIniciales: string[];
}

const MAX_GRABACION_S = 180;

function nuevoId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Pausa entre burbujas de Pepe para que se sienta como alguien escribiendo. */
function pausaPara(texto: string) {
  return Math.min(1400, 350 + texto.length * 12);
}

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** *negritas* como en WhatsApp. */
function conFormato(texto: string): ReactNode[] {
  return texto.split(/(\*[^*\n]+\*)/g).map((parte, i) =>
    parte.startsWith('*') && parte.endsWith('*') && parte.length > 2 ? (
      <strong key={i}>{parte.slice(1, -1)}</strong>
    ) : (
      <span key={i}>{parte}</span>
    ),
  );
}

function tipoDeGrabacion(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  for (const t of ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return '';
}

export function Chat({ codigo, nombre, historial, botonesIniciales }: Props) {
  const [mensajes, setMensajes] = useState<MensajeChat[]>(historial);
  const [botones, setBotones] = useState<string[]>(botonesIniciales);
  const [texto, setTexto] = useState('');
  const [escribiendo, setEscribiendo] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [grabando, setGrabando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [puedeGrabar, setPuedeGrabar] = useState(false);

  const finRef = useRef<HTMLDivElement>(null);
  const arrancoRef = useRef(false);
  const grabadorRef = useRef<MediaRecorder | null>(null);
  const trozosRef = useRef<Blob[]>([]);
  const cancelarRef = useRef(false);
  const relojRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setPuedeGrabar(Boolean(navigator.mediaDevices?.getUserMedia) && tipoDeGrabacion() !== '');
  }, []);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [mensajes, escribiendo, botones]);

  const mostrarRespuesta = useCallback(async (r: RespuestaChat) => {
    for (const m of r.mensajes) {
      setEscribiendo(true);
      await dormir(pausaPara(m));
      setEscribiendo(false);
      setMensajes((xs) => [...xs, { id: nuevoId(), rol: 'pepe', texto: m }]);
    }
    setBotones(r.botones ?? []);
  }, []);

  const enviar = useCallback(
    async (cuerpo: { tipo: 'texto' | 'boton'; texto: string } | { tipo: 'audio'; audio: Blob }, mostrar = true) => {
      const id = nuevoId();
      if (mostrar) {
        setMensajes((xs) => [
          ...xs,
          {
            id,
            rol: 'alumno',
            tipo: cuerpo.tipo,
            texto: cuerpo.tipo === 'audio' ? '🎤 Nota de voz' : cuerpo.texto,
          },
        ]);
      }
      setBotones([]);
      setOcupado(true);
      setEscribiendo(true);
      try {
        let res: Response;
        if (cuerpo.tipo === 'audio') {
          const form = new FormData();
          form.append('codigo', codigo);
          form.append('id', id);
          const ext = cuerpo.audio.type.includes('mp4') ? 'm4a' : cuerpo.audio.type.includes('ogg') ? 'ogg' : 'webm';
          form.append('audio', cuerpo.audio, `nota.${ext}`);
          res = await fetch('/api/chat', { method: 'POST', body: form });
        } else {
          res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ codigo, id, tipo: cuerpo.tipo, texto: cuerpo.texto }),
          });
        }
        const datos = (await res.json()) as RespuestaChat & { error?: string };
        if (!res.ok) throw new Error(datos.error ?? 'Error');
        setEscribiendo(false);
        await mostrarRespuesta(datos);
      } catch (err) {
        setEscribiendo(false);
        const reintentar = () => {
          setMensajes((xs) => xs.filter((m) => m.id !== `${id}-error`));
          void enviar(cuerpo, false);
        };
        setMensajes((xs) => [
          ...xs,
          {
            id: `${id}-error`,
            rol: 'sistema',
            texto: `${err instanceof Error && err.message !== 'Error' ? err.message : 'No se pudo enviar'}. Toca para reintentar.`,
            reintentar,
          },
        ]);
      } finally {
        setOcupado(false);
      }
    },
    [codigo, mostrarRespuesta],
  );

  // Primera vez: saludar a Pepe para que arranque el reto.
  useEffect(() => {
    if (historial.length === 0 && !arrancoRef.current) {
      arrancoRef.current = true;
      void enviar({ tipo: 'texto', texto: 'hola' }, false);
    }
  }, [historial.length, enviar]);

  function alEnviar(e: FormEvent) {
    e.preventDefault();
    const t = texto.trim();
    if (!t || ocupado) return;
    setTexto('');
    void enviar({ tipo: 'texto', texto: t });
  }

  async function empezarGrabacion() {
    if (ocupado || grabando) return;
    try {
      const flujo = await navigator.mediaDevices.getUserMedia({ audio: true });
      const grabador = new MediaRecorder(flujo, { mimeType: tipoDeGrabacion() });
      trozosRef.current = [];
      cancelarRef.current = false;
      grabador.ondataavailable = (ev) => ev.data.size > 0 && trozosRef.current.push(ev.data);
      grabador.onstop = () => {
        flujo.getTracks().forEach((t) => t.stop());
        if (relojRef.current) clearInterval(relojRef.current);
        setGrabando(false);
        const audio = new Blob(trozosRef.current, { type: grabador.mimeType });
        trozosRef.current = [];
        if (!cancelarRef.current && audio.size > 0) void enviar({ tipo: 'audio', audio });
      };
      grabador.start();
      grabadorRef.current = grabador;
      setSegundos(0);
      setGrabando(true);
      relojRef.current = setInterval(() => {
        setSegundos((s) => {
          if (s + 1 >= MAX_GRABACION_S) grabadorRef.current?.stop();
          return s + 1;
        });
      }, 1000);
    } catch {
      setMensajes((xs) => [
        ...xs,
        { id: nuevoId(), rol: 'sistema', texto: 'No pude usar el micrófono. Revisa el permiso del navegador o escríbele a Pepe.' },
      ]);
    }
  }

  function terminarGrabacion(cancelar: boolean) {
    cancelarRef.current = cancelar;
    grabadorRef.current?.stop();
  }

  const mmss = `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')}`;

  return (
    <div className="flex h-dvh flex-col bg-chat-fondo">
      <header className="flex items-center gap-3 bg-primary px-4 py-3 text-primary-foreground shadow-sm">
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-foreground/15 text-xl"
          aria-hidden
        >
          🦎
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-tight">Pepe</p>
          <p className="text-xs opacity-85" aria-live="polite">
            {escribiendo ? 'escribiendo…' : grabando ? 'escuchándote…' : `tu compa de 1° · hola, ${nombre}`}
          </p>
        </div>
        <span className="rounded-full bg-primary-foreground/15 px-2 py-0.5 font-mono text-[11px]">{codigo}</span>
      </header>

      <main className="flex-1 overflow-y-auto px-3 py-4" aria-live="polite" aria-label="Conversación con Pepe">
        <div className="mx-auto flex max-w-xl flex-col gap-1.5">
          {mensajes.map((m) =>
            m.rol === 'sistema' ? (
              <button
                key={m.id}
                type="button"
                onClick={m.reintentar}
                disabled={!m.reintentar}
                className="mx-auto my-1 rounded-lg bg-aviso/20 px-3 py-1.5 text-center text-xs text-foreground"
              >
                {m.texto}
              </button>
            ) : (
              <div
                key={m.id}
                className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-[15px] leading-snug shadow-sm ${
                  m.rol === 'pepe'
                    ? 'self-start rounded-tl-sm bg-burbuja-pepe'
                    : 'self-end rounded-tr-sm bg-burbuja-alumno'
                }`}
              >
                {conFormato(m.texto)}
              </div>
            ),
          )}
          {escribiendo && (
            <div className="flex gap-1 self-start rounded-2xl rounded-tl-sm bg-burbuja-pepe px-4 py-3 shadow-sm" aria-label="Pepe está escribiendo">
              <span className="punto-escribiendo size-2 rounded-full bg-muted-foreground" />
              <span className="punto-escribiendo size-2 rounded-full bg-muted-foreground" />
              <span className="punto-escribiendo size-2 rounded-full bg-muted-foreground" />
            </div>
          )}
          <div ref={finRef} />
        </div>
      </main>

      <footer className="border-t border-border/60 bg-background/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur">
        <div className="mx-auto max-w-xl">
          {botones.length > 0 && !ocupado && (
            <div className="mb-2 flex flex-wrap gap-2" role="group" aria-label="Respuestas rápidas">
              {botones.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => void enviar({ tipo: 'boton', texto: b })}
                  className="min-h-11 rounded-full border-2 border-primary bg-background px-4 text-sm font-medium text-primary transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {b}
                </button>
              ))}
            </div>
          )}

          {grabando ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => terminarGrabacion(true)}
                className="min-h-11 rounded-full px-4 text-sm text-muted-foreground hover:bg-muted"
              >
                Cancelar
              </button>
              <div className="flex flex-1 items-center justify-center gap-2 text-sm" aria-live="polite">
                <span className="size-2.5 animate-pulse rounded-full bg-peligro" aria-hidden />
                Grabando {mmss}
              </div>
              <button
                type="button"
                onClick={() => terminarGrabacion(false)}
                className="min-h-11 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground"
              >
                Enviar
              </button>
            </div>
          ) : (
            <form onSubmit={alEnviar} className="flex items-end gap-2">
              <label htmlFor="mensaje" className="sr-only">
                Mensaje para Pepe
              </label>
              <input
                id="mensaje"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Escríbele a Pepe…"
                autoComplete="off"
                maxLength={1000}
                className="min-h-11 flex-1 rounded-full border border-input bg-background px-4 text-[16px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              {texto.trim() || !puedeGrabar ? (
                <button
                  type="submit"
                  disabled={ocupado || !texto.trim()}
                  aria-label="Enviar"
                  className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
                >
                  <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
                    <path d="M3.4 20.4 21 12 3.4 3.6 3.4 10l12.6 2-12.6 2z" />
                  </svg>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void empezarGrabacion()}
                  disabled={ocupado}
                  aria-label="Grabar nota de voz"
                  className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
                >
                  <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
                    <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.9V21h2v-3.1A7 7 0 0 0 19 11h-2Z" />
                  </svg>
                </button>
              )}
            </form>
          )}
        </div>
      </footer>
    </div>
  );
}
