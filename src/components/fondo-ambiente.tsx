'use client';

/**
 * Fondo animado: el agua de un canal de Xochimilco, donde vive Pepe.
 * Receta "terreno de ondas" adaptada:
 *   - capa lejana: aurora de luz sobre el agua (CSS, deriva lenta);
 *   - capa media: la superficie del canal en malla de ondas (canvas, en perspectiva);
 *   - capa cercana: burbujas y hojas de lirio flotando (más parallax).
 * Completo en el inicio y tranquilo en el chat y el panel. Solo transform y
 * opacity; el canvas se pausa con la pestaña oculta; con movimiento reducido se
 * dibuja una escena quieta.
 */
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from 'motion/react';

function useCanvasLoop(
  ref: RefObject<HTMLCanvasElement | null>,
  reduce: boolean,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => void,
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ctx = el.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    let raf = 0;
    const resize = () => {
      w = el.clientWidth;
      h = el.clientHeight;
      el.width = w * dpr;
      el.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (reduce) draw(ctx, w, h, 0);
    };
    resize();
    window.addEventListener('resize', resize);
    if (reduce) return () => window.removeEventListener('resize', resize);
    const loop = (t: number) => {
      draw(ctx, w, h, t / 1000);
      raf = requestAnimationFrame(loop);
    };
    const vis = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    document.addEventListener('visibilitychange', vis);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', vis);
    };
  }, [ref, reduce, draw]);
}

/** Superficie del canal: filas de ondas en perspectiva que se inclinan con el puntero. */
function AguaDelCanal({ reduce, completo, px }: { reduce: boolean; completo: boolean; px: MotionValue<number> }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => {
      const estilo = getComputedStyle(document.documentElement);
      const color = estilo.getPropertyValue('--fondo-onda').trim() || '#2aa198';
      const movil = w < 768;
      const COLS = movil ? 22 : completo ? 48 : 34;
      const ROWS = movil ? 12 : completo ? 22 : 16;
      const FOV = 500;
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      const tilt = px.get() * 0.12;
      for (let r = 0; r < ROWS; r++) {
        ctx.beginPath();
        for (let c = 0; c <= COLS; c++) {
          const x = (c / COLS - 0.5) * w * 2.4;
          const z = r * 58 + 30;
          const y = Math.sin(c * 0.33 + t * 0.7) * 16 + Math.cos(r * 0.5 + t * 0.5) * 12 + 150;
          const xr = x * Math.cos(tilt) - z * Math.sin(tilt);
          const zr = x * Math.sin(tilt) + z * Math.cos(tilt);
          const k = FOV / (FOV + zr);
          const sx = w / 2 + xr * k;
          const sy = h * 0.58 + y * k;
          if (c === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.globalAlpha = 0.55 * (1 - r / ROWS);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    },
    [completo, px],
  );
  useCanvasLoop(ref, reduce, draw);
  return <canvas ref={ref} className="amb-capa amb-agua" />;
}

interface Flotante {
  tipo: 'burbuja' | 'lirio';
  x: string;
  y: string;
  tam: number;
  prof: number; // 0 (lejos) a 1 (cerca)
  dur: number;
  movil: boolean;
}

const FLOTANTES_COMPLETO: Flotante[] = [
  { tipo: 'lirio', x: '8%', y: '72%', tam: 88, prof: 0.9, dur: 14, movil: false },
  { tipo: 'lirio', x: '82%', y: '80%', tam: 64, prof: 0.6, dur: 17, movil: false },
  { tipo: 'burbuja', x: '18%', y: '28%', tam: 18, prof: 0.7, dur: 9, movil: true },
  { tipo: 'burbuja', x: '74%', y: '22%', tam: 26, prof: 1, dur: 11, movil: true },
  { tipo: 'burbuja', x: '88%', y: '48%', tam: 12, prof: 0.4, dur: 8, movil: false },
  { tipo: 'burbuja', x: '40%', y: '12%', tam: 10, prof: 0.3, dur: 10, movil: false },
];
const FLOTANTES_TRANQUILO: Flotante[] = [
  { tipo: 'burbuja', x: '86%', y: '30%', tam: 16, prof: 0.6, dur: 12, movil: false },
  { tipo: 'lirio', x: '-2%', y: '84%', tam: 72, prof: 0.5, dur: 18, movil: false },
];

function Lirio({ tam }: { tam: number }) {
  return (
    <svg viewBox="0 0 100 100" width={tam} height={tam} aria-hidden>
      <path d="M50 8 A42 42 0 1 0 92 50 L50 50 Z" fill="var(--fondo-lirio)" />
      <path d="M50 50 L86 28" stroke="var(--fondo-lirio-vena)" strokeWidth="2" />
      <path d="M50 50 L30 18 M50 50 L18 62 M50 50 L56 88" stroke="var(--fondo-lirio-vena)" strokeWidth="1.5" opacity="0.7" />
      <circle cx="66" cy="70" r="7" fill="var(--fondo-flor)" />
    </svg>
  );
}

function CapaFlotantes({
  items,
  movil,
  px,
  py,
  scroll,
  reduce,
}: {
  items: Flotante[];
  movil: boolean;
  px: MotionValue<number>;
  py: MotionValue<number>;
  scroll: MotionValue<number>;
  reduce: boolean;
}) {
  return (
    <>
      {items
        .filter((f) => !movil || f.movil)
        .map((f, i) => (
          <FlotanteItem key={i} f={f} px={px} py={py} scroll={scroll} reduce={reduce} />
        ))}
    </>
  );
}

function FlotanteItem({
  f,
  px,
  py,
  scroll,
  reduce,
}: {
  f: Flotante;
  px: MotionValue<number>;
  py: MotionValue<number>;
  scroll: MotionValue<number>;
  reduce: boolean;
}) {
  const x = useTransform(px, (v) => v * 24 * f.prof);
  const yPuntero = useTransform(py, (v) => v * 16 * f.prof);
  const yScroll = useTransform(scroll, (v) => v * -160 * f.prof);
  const y = useTransform([yPuntero, yScroll], ([a, b]) => (a as number) + (b as number));
  return (
    <motion.div
      className="amb-flotante"
      style={{ left: f.x, top: f.y, x: reduce ? 0 : x, y: reduce ? 0 : y }}
    >
      <div
        className={f.tipo === 'burbuja' ? 'amb-burbuja' : 'amb-lirio'}
        style={{
          width: f.tipo === 'burbuja' ? f.tam : undefined,
          height: f.tipo === 'burbuja' ? f.tam : undefined,
          animationDuration: `${f.dur}s`,
          animationDelay: `${-f.dur * 0.37}s`,
        }}
      >
        {f.tipo === 'lirio' && <Lirio tam={f.tam} />}
      </div>
    </motion.div>
  );
}

export function FondoAmbiente() {
  const completo = usePathname() === '/';
  const reduce = useReducedMotion() ?? false;
  const [movil, setMovil] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const u = () => setMovil(mq.matches);
    u();
    mq.addEventListener('change', u);
    return () => mq.removeEventListener('change', u);
  }, []);

  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const px = useSpring(rx, { stiffness: 40, damping: 18 });
  const py = useSpring(ry, { stiffness: 40, damping: 18 });
  useEffect(() => {
    if (reduce || !window.matchMedia('(pointer: fine)').matches) return;
    const on = (e: PointerEvent) => {
      rx.set((e.clientX / window.innerWidth - 0.5) * 2);
      ry.set((e.clientY / window.innerHeight - 0.5) * 2);
    };
    window.addEventListener('pointermove', on, { passive: true });
    return () => window.removeEventListener('pointermove', on);
  }, [reduce, rx, ry]);
  const { scrollYProgress } = useScroll();
  const scroll = useSpring(scrollYProgress, { stiffness: 60, damping: 20 });
  const yAgua = useTransform(scroll, (v) => (reduce ? 0 : v * -60));
  const xAurora = useTransform(px, (v) => (reduce ? 0 : v * -12));

  return (
    <div aria-hidden className={`amb-raiz ${completo ? 'amb-completo' : 'amb-tranquilo'}`}>
      <motion.div className="amb-capa amb-aurora" style={{ x: xAurora }} />
      <motion.div className="amb-capa" style={{ y: yAgua }}>
        <AguaDelCanal reduce={reduce} completo={completo} px={px} />
      </motion.div>
      <CapaFlotantes
        items={completo ? FLOTANTES_COMPLETO : FLOTANTES_TRANQUILO}
        movil={movil}
        px={px}
        py={py}
        scroll={scroll}
        reduce={reduce}
      />
      <div className="amb-vineta" />
    </div>
  );
}
