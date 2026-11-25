'use client';

/**
 * Chat del alumno con Pepe, estilo WhatsApp y pensado primero para celular.
 * Los botones de Pepe aparecen como chips; el micrófono graba una nota de voz
 * con MediaRecorder que pasa por la misma transcripción que WhatsApp.
 */
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, ArrowRight, BookOpenText, House, Mic, MousePointerClick, PartyPopper, RotateCcw, SendHorizontal, Sigma, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import type { RespuestaChat } from '@/app/api/chat/route';
import { PepeAjolote } from '@/components/pepe-ajolote';
import { Toast } from '@/components/toast';

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
  /** El reto en curso, para mostrarlo arriba. */
  reto: { titulo: string; materia: 'matematicas' | 'lectura' } | null;
  /** La sesión ya terminó: se ofrece el siguiente reto en vez del teclado. */
  terminado: boolean;
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

export function Chat({ codigo, nombre, historial, botonesIniciales, reto, terminado: terminadoInicial }: Props) {
  const router = useRouter();
  const [terminado, setTerminado] = useState(terminadoInicial);
  const [aviso, setAviso] = useState<string | null>(null);
  const cerrarAviso = useCallback(() => setAviso(null), []);
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
    if (r.fase === 'terminado') setTerminado(true);
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
            texto: cuerpo.tipo === 'audio' ? 'Nota de voz' : cuerpo.texto,
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
            texto: `${err instanceof Error && err.message !== 'Error' ? err.message : 'No se pudo enviar tu mensaje'}. Revisa tu internet.`,
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

  const [pasando, setPasando] = useState(false);
  async function siguienteReto() {
    setPasando(true);
    setTerminado(false);
    await enviar({ tipo: 'texto', texto: 'hola' }, false);
    setPasando(false);
    // Recarga los datos del servidor: el título del reto nuevo y su conversación.
    router.refresh();
  }

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
      setAviso('No pude usar el micrófono. Dale permiso en tu navegador o escríbele a Pepe.');
    }
  }

  function terminarGrabacion(cancelar: boolean) {
    cancelarRef.current = cancelar;
    grabadorRef.current?.stop();
  }

  const mmss = `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')}`;
  const reduce = useReducedMotion();
  const entradaBurbuja = reduce
    ? undefined
    : { initial: { opacity: 0, y: 10, scale: 0.97 }, animate: { opacity: 1, y: 0, scale: 1 } };
  const resorte = { type: 'spring' as const, stiffness: 300, damping: 26 };
  const estado = escribiendo ? 'escribiendo…' : grabando ? 'escuchándote…' : `en línea · hola, ${nombre}`;

  return (
    <div className="flex h-dvh flex-col">
      <Toast mensaje={aviso} alCerrar={cerrarAviso} />
      <header className="z-10 px-3 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <div className="tarjeta-clay mx-auto flex max-w-2xl items-center gap-2 rounded-3xl px-2 py-2 sm:gap-3 sm:px-3">
          <Link
            href="/"
            aria-label="Salir al inicio"
            className="flex size-11 shrink-0 items-center justify-center rounded-2xl text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="size-5" aria-hidden />
          </Link>
          <div className="relative flex size-12 shrink-0 items-center justify-center rounded-2xl bg-ajolote/35">
            <PepeAjolote vivo cara={escribiendo ? 'pensando' : 'feliz'} className="w-11" />
            <span className="absolute -right-0.5 -bottom-0.5 size-3.5 rounded-full border-2 border-card bg-exito" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="texto-titulo text-lg leading-none">Pepe</p>
            <p className="mt-1 truncate text-[13px] text-muted-foreground" aria-live="polite">
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={estado}
                  initial={reduce ? false : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? undefined : { opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className={`inline-block ${escribiendo || grabando ? 'font-bold text-primary' : ''}`}
                >
                  {estado}
                </motion.span>
              </AnimatePresence>
            </p>
          </div>
          <span className="hidden rounded-xl bg-muted px-2.5 py-1 font-mono text-xs font-semibold text-muted-foreground min-[360px]:inline">
            {codigo}
          </span>
        </div>
        {reto && (
          <div className="mx-auto mt-2 flex max-w-2xl justify-center">
            <p className="inline-flex max-w-full items-center gap-2 rounded-full border-2 border-border bg-card/90 px-3 py-1 text-[13px] font-bold shadow-clay">
              {reto.materia === 'lectura' ? (
                <BookOpenText className="size-4 shrink-0 text-ajolote-branquia" aria-hidden />
              ) : (
                <Sigma className="size-4 shrink-0 text-primary" aria-hidden />
              )}
              <span className="text-muted-foreground">{reto.materia === 'lectura' ? 'Lectura' : 'Matemáticas'}</span>
              <span aria-hidden className="text-muted-foreground">·</span>
              <span className="truncate">{reto.titulo}</span>
            </p>
          </div>
        )}
      </header>

      <main id="contenido" className="flex-1 overflow-y-auto px-3 py-4" aria-live="polite" aria-label="Conversación con Pepe">
        <div className="mx-auto flex max-w-2xl flex-col gap-2">
          <p className="mx-auto mb-2 max-w-xs rounded-2xl bg-card/70 px-3 py-2 text-center text-[13px] text-muted-foreground shadow-clay">
            Pepe se equivoca a propósito. <strong className="text-foreground">Nunca te va a dar la respuesta</strong>: encuéntrala tú.
          </p>
          <AnimatePresence initial={false}>
            {mensajes.map((m, i) => {
              if (m.rol === 'sistema') {
                return (
                  <motion.div key={m.id} {...entradaBurbuja} transition={resorte} className="mx-auto my-1 flex max-w-sm flex-col items-center gap-2 rounded-2xl border border-peligro/30 bg-card px-4 py-3 text-center shadow-clay" role="alert">
                    <p className="text-sm">{m.texto}</p>
                    {m.reintentar && (
                      <button
                        type="button"
                        onClick={m.reintentar}
                        className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 text-sm font-extrabold text-primary-foreground shadow-boton focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40"
                      >
                        <RotateCcw className="size-4" aria-hidden /> Reintentar
                      </button>
                    )}
                  </motion.div>
                );
              }
              const esPepe = m.rol === 'pepe';
              const primeroDelGrupo = mensajes[i - 1]?.rol !== m.rol;
              return (
                <motion.div
                  key={m.id}
                  {...entradaBurbuja}
                  transition={resorte}
                  className={`flex items-end gap-2 ${esPepe ? 'self-start' : 'self-end'} max-w-[88%] ${primeroDelGrupo ? 'mt-2' : ''}`}
                >
                  {esPepe && (
                    <span className={`flex size-8 shrink-0 items-center justify-center rounded-xl bg-ajolote/35 ${primeroDelGrupo ? '' : 'invisible'}`} aria-hidden>
                      <PepeAjolote className="w-7" />
                    </span>
                  )}
                  <div
                    className={`whitespace-pre-wrap break-words px-4 py-2.5 text-[16px] leading-snug shadow-clay ${
                      esPepe
                        ? `rounded-3xl border border-burbuja-pepe-borde bg-burbuja-pepe ${primeroDelGrupo ? 'rounded-bl-md' : ''}`
                        : `rounded-3xl bg-burbuja-alumno text-burbuja-alumno-texto ${primeroDelGrupo ? 'rounded-br-md' : ''}`
                    }`}
                  >
                    {m.tipo === 'audio' ? (
                      <span className="flex items-center gap-2 font-semibold">
                        <Mic className="size-4" aria-hidden />
                        <span className="flex h-5 items-center gap-[3px]" aria-hidden>
                          {[6, 12, 18, 10, 16, 8, 14, 6, 11].map((h, k) => (
                            <span key={k} className="w-[3px] rounded-full bg-current opacity-80" style={{ height: h }} />
                          ))}
                        </span>
                        Nota de voz
                      </span>
                    ) : (
                      conFormato(m.texto)
                    )}
                  </div>
                </motion.div>
              );
            })}
            {escribiendo && (
              <motion.div
                key="escribiendo"
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, transition: { duration: 0.1 } }}
                className="mt-2 flex items-end gap-2 self-start"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-ajolote/35" aria-hidden>
                  <PepeAjolote cara="pensando" className="w-7" />
                </span>
                <div className="flex gap-1.5 rounded-3xl rounded-bl-md border border-burbuja-pepe-borde bg-burbuja-pepe px-4 py-3.5 shadow-clay" aria-label="Pepe está escribiendo">
                  <span className="punto-escribiendo size-2 rounded-full bg-ajolote-branquia" />
                  <span className="punto-escribiendo size-2 rounded-full bg-ajolote-branquia" />
                  <span className="punto-escribiendo size-2 rounded-full bg-ajolote-branquia" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={finRef} />
        </div>
      </main>

      <footer className="px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-2xl">
          <AnimatePresence>
            {botones.length > 0 && !ocupado && (
              <motion.div
                key={botones.join('|')}
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: 6, transition: { duration: 0.1 } }}
                transition={resorte}
                className="mb-2"
                role="group"
                aria-labelledby="titulo-respuestas"
              >
                <p id="titulo-respuestas" className="mb-1.5 flex items-center gap-1.5 px-1 text-[13px] font-bold text-muted-foreground">
                  <MousePointerClick className="size-4 text-primary" aria-hidden /> Toca una respuesta o escribe la tuya abajo
                </p>
                <div className="flex flex-wrap gap-2">
                {botones.map((b) => (
                  <motion.button
                    key={b}
                    type="button"
                    whileHover={reduce ? undefined : { scale: 1.03 }}
                    whileTap={reduce ? undefined : { scale: 0.96 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    onClick={() => void enviar({ tipo: 'boton', texto: b })}
                    className="min-h-11 cursor-pointer rounded-2xl border-2 border-primary/40 bg-primary/10 px-4 text-[15px] font-extrabold text-foreground transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40"
                  >
                    {b}
                  </motion.button>
                ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait" initial={false}>
          {terminado ? (
            <motion.div
              key="terminado"
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, transition: { duration: 0.12 } }}
              transition={resorte}
              className="tarjeta-clay flex flex-col items-center gap-3 rounded-3xl p-5 text-center"
              role="status"
            >
              <div className="flex items-center gap-2">
                <PepeAjolote vivo className="w-16" />
                <PartyPopper className="size-7 text-trajinera-tinta" aria-hidden />
              </div>
              <div>
                <p className="texto-titulo text-xl">¡Reto terminado!</p>
                <p className="text-[15px] text-muted-foreground">Gracias por ayudar a Pepe. ¿Le entras a otro?</p>
              </div>
              <div className="flex w-full flex-col gap-2 min-[440px]:flex-row">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  onClick={() => void siguienteReto()}
                  disabled={pasando}
                  className="inline-flex min-h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-primary px-5 font-extrabold text-primary-foreground shadow-boton disabled:opacity-60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40"
                >
                  Siguiente reto <ArrowRight className="size-4" aria-hidden />
                </motion.button>
                <Link
                  href="/"
                  className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-border bg-card px-5 font-extrabold shadow-clay focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40"
                >
                  <House className="size-4" aria-hidden /> Salir
                </Link>
              </div>
            </motion.div>
          ) : (
          <motion.div
            key="teclado"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
          >
            {botones.length === 0 && (
              <p className="mb-1.5 px-1 text-[13px] font-bold text-muted-foreground" aria-live="polite">
                {grabando
                  ? 'Te estoy escuchando. Toca Enviar cuando termines.'
                  : ocupado
                    ? 'Espera a que Pepe conteste…'
                    : puedeGrabar
                      ? 'Escribe tu respuesta y toca Enviar, o toca Voz para hablarle.'
                      : 'Escribe tu respuesta y toca Enviar.'}
              </p>
            )}
            <div className="tarjeta-clay rounded-3xl p-2">
            {grabando ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => terminarGrabacion(true)}
                  className="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-2xl border-2 border-border px-3 text-sm font-extrabold text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Trash2 className="size-4" aria-hidden /> Cancelar
                </button>
                <div className="flex flex-1 items-center justify-center gap-3" aria-live="polite">
                  <span className="size-2.5 animate-pulse rounded-full bg-peligro" aria-hidden />
                  <span className="flex h-6 items-center gap-[3px]" aria-hidden>
                    {Array.from({ length: 14 }, (_, k) => (
                      <span key={k} className="barra-voz h-6 w-[3px] rounded-full bg-primary" style={{ animationDelay: `${(k % 7) * 0.11}s` }} />
                    ))}
                  </span>
                  <span className="font-mono text-sm font-semibold tabular-nums">{mmss}</span>
                </div>
                <motion.button
                  type="button"
                  whileTap={reduce ? undefined : { scale: 0.94 }}
                  onClick={() => terminarGrabacion(false)}
                  className="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-2xl bg-primary px-4 text-sm font-extrabold text-primary-foreground shadow-boton focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40"
                >
                  Enviar <SendHorizontal className="size-4" aria-hidden />
                </motion.button>
              </div>
            ) : (
              <form onSubmit={alEnviar} className="flex items-center gap-2">
                <label htmlFor="mensaje" className="sr-only">
                  Mensaje para Pepe
                </label>
                <input
                  id="mensaje"
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  placeholder="Escribe tu respuesta…"
                  autoComplete="off"
                  maxLength={1000}
                  className="min-h-11 min-w-0 flex-1 rounded-2xl bg-transparent px-3 text-[16px] outline-none placeholder:text-muted-foreground/80 focus-visible:ring-2 focus-visible:ring-ring/40"
                />
                <AnimatePresence mode="wait" initial={false}>
                  {texto.trim() || !puedeGrabar ? (
                    <motion.button
                      key="enviar"
                      type="submit"
                      initial={reduce ? false : { scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={reduce ? undefined : { scale: 0.6, opacity: 0 }}
                      whileTap={reduce ? undefined : { scale: 0.94 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                      disabled={ocupado || !texto.trim()}
                      className="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-2xl bg-primary px-4 text-sm font-extrabold text-primary-foreground shadow-boton disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40"
                    >
                      Enviar <SendHorizontal className="size-4" aria-hidden />
                    </motion.button>
                  ) : (
                    <motion.button
                      key="grabar"
                      type="button"
                      initial={reduce ? false : { scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={reduce ? undefined : { scale: 0.6, opacity: 0 }}
                      whileTap={reduce ? undefined : { scale: 0.94 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                      onClick={() => void empezarGrabacion()}
                      disabled={ocupado}
                      aria-label="Voz: grabar una nota de voz"
                      className="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-2xl border-2 border-ajolote-branquia/50 bg-ajolote/30 px-4 text-sm font-extrabold text-foreground disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40"
                    >
                      <Mic className="size-4 text-ajolote-branquia" aria-hidden /> Voz
                    </motion.button>
                  )}
                </AnimatePresence>
              </form>
            )}
            </div>
          </motion.div>
          )}
          </AnimatePresence>
        </div>
      </footer>
    </div>
  );
}
