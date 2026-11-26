'use client';

/**
 * Tarjetas de los 3 videos de Pepe. Cada tarjeta muestra su portada; al pasar
 * el mouse (o al enfocarla con teclado) los videos propios reproducen una vista
 * previa muda de 6 s. Al tocarla se abre el reproductor en un <dialog>.
 * El de YouTube solo se carga al abrirlo (youtube-nocookie), para no meter
 * rastreadores ni peso en la página.
 */
import { motion, useReducedMotion } from 'motion/react';
import { Clapperboard, ExternalLink, Film, Play, Smartphone, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export interface VideoDemo {
  id: string;
  titulo: string;
  descripcion: string;
  etiqueta: string;
  duracion: string;
  vertical: boolean;
  poster: string;
  /** Video propio (mp4) o, si no, un video de YouTube. */
  mp4?: string;
  preview?: string;
  youtube?: string;
  icono: 'reel' | 'youtube' | 'app';
}

const ICONOS = { reel: Smartphone, youtube: Film, app: Clapperboard };

function Tarjeta({ v, alAbrir, indice }: { v: VideoDemo; alAbrir: () => void; indice: number }) {
  const reduce = useReducedMotion();
  const previewRef = useRef<HTMLVideoElement>(null);
  const [viendo, setViendo] = useState(false);
  const Icono = ICONOS[v.icono];

  function empezar() {
    if (reduce || !v.preview) return;
    setViendo(true);
    void previewRef.current?.play().catch(() => undefined);
  }
  function parar() {
    setViendo(false);
    const p = previewRef.current;
    if (p) {
      p.pause();
      p.currentTime = 0;
    }
  }

  return (
    <motion.li
      initial={reduce ? false : { y: 24 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 220, damping: 24, delay: 0.08 * indice }}
      className="h-full"
    >
      <button
        type="button"
        onClick={alAbrir}
        onMouseEnter={empezar}
        onMouseLeave={parar}
        onFocus={empezar}
        onBlur={parar}
        aria-label={`Ver: ${v.titulo} (${v.duracion})`}
        className="tarjeta-clay group flex h-full w-full cursor-pointer flex-col overflow-hidden text-left transition-transform hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40 motion-reduce:hover:translate-y-0"
      >
        <span className={`relative block aspect-video overflow-hidden ${v.vertical ? 'bg-gradient-to-br from-primary/70 via-ajolote/60 to-trajinera/60' : 'bg-foreground/90'}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={v.poster}
            alt=""
            loading={indice === 0 ? 'eager' : 'lazy'}
            className={`absolute inset-0 h-full w-full transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:group-hover:scale-100 ${v.vertical ? 'object-contain py-2 drop-shadow-lg' : 'object-cover'}`}
          />
          {v.preview && (
            <video
              ref={previewRef}
              src={v.preview}
              muted
              loop
              playsInline
              preload="none"
              aria-hidden
              className={`absolute inset-0 h-full w-full transition-opacity duration-300 ${v.vertical ? 'object-contain py-2' : 'object-cover'} ${viendo ? 'opacity-100' : 'opacity-0'}`}
            />
          )}
          <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-card/95 px-2.5 py-1 text-xs font-extrabold text-foreground shadow-clay">
            <Icono className="size-3.5 text-primary" aria-hidden /> {v.etiqueta}
          </span>
          <span className="absolute right-3 bottom-3 rounded-lg bg-foreground/85 px-2 py-0.5 font-mono text-xs font-semibold text-background">
            {v.duracion}
          </span>
          <span className="absolute inset-0 flex items-center justify-center" aria-hidden>
            <span className="flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-boton transition-transform group-hover:scale-110 motion-reduce:group-hover:scale-100">
              <Play className="ml-1 size-7 fill-current" />
            </span>
          </span>
        </span>
        <span className="flex flex-1 flex-col gap-1.5 p-5">
          <span className="texto-titulo text-xl">{v.titulo}</span>
          <span className="text-[15px] text-muted-foreground">{v.descripcion}</span>
          <span className="mt-auto pt-3 text-sm font-extrabold text-primary">Ver video →</span>
        </span>
      </button>
    </motion.li>
  );
}

export function VideosDemo({ videos }: { videos: VideoDemo[] }) {
  const [abierto, setAbierto] = useState<VideoDemo | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (abierto && !d.open) d.showModal();
    if (!abierto && d.open) d.close();
  }, [abierto]);

  return (
    <>
      <ul className="grid items-stretch gap-6 md:grid-cols-3">
        {videos.map((v, i) => (
          <Tarjeta key={v.id} v={v} indice={i} alAbrir={() => setAbierto(v)} />
        ))}
      </ul>

      <dialog
        ref={dialogRef}
        onClose={() => setAbierto(null)}
        onClick={(e) => e.target === e.currentTarget && setAbierto(null)}
        aria-label={abierto ? abierto.titulo : 'Video'}
        className="m-auto w-[min(100vw-2rem,64rem)] max-w-none overflow-visible bg-transparent p-0 backdrop:bg-black/85 backdrop:backdrop-blur-sm"
      >
        {abierto && (
          <div className="flex flex-col items-center gap-3">
            <div className="flex w-full items-center justify-between gap-3">
              <p className="texto-titulo truncate text-lg text-white">{abierto.titulo}</p>
              <button
                type="button"
                onClick={() => setAbierto(null)}
                aria-label="Cerrar video"
                className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-card text-foreground shadow-clay focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <div
              className={`overflow-hidden rounded-2xl bg-black shadow-2xl ${
                abierto.vertical ? 'aspect-[9/16] h-[min(78dvh,calc((100vw-2rem)*16/9))]' : 'aspect-video w-full'
              }`}
            >
              {abierto.mp4 ? (
                <video src={abierto.mp4} poster={abierto.poster} controls autoPlay playsInline className="h-full w-full" />
              ) : (
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${abierto.youtube}?autoplay=1&rel=0`}
                  title={abierto.titulo}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                  className="h-full w-full"
                />
              )}
            </div>
            {abierto.youtube && (
              <a
                href={`https://youtu.be/${abierto.youtube}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-bold text-white underline underline-offset-4"
              >
                Ver en YouTube <ExternalLink className="size-4" aria-hidden />
              </a>
            )}
          </div>
        )}
      </dialog>
    </>
  );
}
