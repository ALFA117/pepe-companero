'use client';

/**
 * Receta "malla low-poly con Three.js", adaptada al tema: una gran burbuja de
 * agua del canal (icosaedro en wireframe que respira y gira) con burbujitas
 * alrededor. Solo en el inicio y cargada sin SSR (next/dynamic), para no pesar
 * en el chat ni en el primer render. Pausa con la pestaña oculta; con
 * movimiento reducido dibuja un solo cuadro.
 */
import { useEffect, useRef } from 'react';
import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Scene,
  WebGLRenderer,
} from 'three';

const COLORES = {
  claro: { malla: '#1f8a86', puntos: '#e0457b', opMalla: 0.22, opPuntos: 0.55 },
  oscuro: { malla: '#5cc9bf', puntos: '#f08aa8', opMalla: 0.3, opPuntos: 0.7 },
};

export default function Burbuja3D() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const movil = window.matchMedia('(max-width: 767px)').matches;
    const oscuro = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const c = oscuro ? COLORES.oscuro : COLORES.claro;

    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ canvas, alpha: true, antialias: !movil });
    } catch {
      return; // Sin WebGL: el fondo del canal sigue funcionando.
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    const escena = new Scene();
    const camara = new PerspectiveCamera(45, 1, 0.1, 100);
    camara.position.z = 6;

    const geoMalla = new IcosahedronGeometry(1.7, movil ? 1 : 2);
    const matMalla = new MeshBasicMaterial({ color: new Color(c.malla), wireframe: true, transparent: true, opacity: c.opMalla });
    const malla = new Mesh(geoMalla, matMalla);
    escena.add(malla);

    const n = movil ? 350 : 900;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = 2.1 + Math.random() * 1.6;
      const t = Math.random() * Math.PI * 2;
      const f = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(f) * Math.cos(t);
      pos[i * 3 + 1] = r * Math.sin(f) * Math.sin(t);
      pos[i * 3 + 2] = r * Math.cos(f);
    }
    const geoPuntos = new BufferGeometry();
    geoPuntos.setAttribute('position', new Float32BufferAttribute(pos, 3));
    const matPuntos = new PointsMaterial({ color: new Color(c.puntos), size: movil ? 0.035 : 0.03, transparent: true, opacity: c.opPuntos });
    const puntos = new Points(geoPuntos, matPuntos);
    escena.add(puntos);

    const tam = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      renderer.setSize(w, h, false);
      camara.aspect = w / Math.max(h, 1);
      camara.updateProjectionMatrix();
    };
    tam();
    window.addEventListener('resize', tam);

    let px = 0;
    let py = 0;
    const puntero = (e: PointerEvent) => {
      px = (e.clientX / window.innerWidth - 0.5) * 2;
      py = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    if (!reduce && window.matchMedia('(pointer: fine)').matches) window.addEventListener('pointermove', puntero, { passive: true });

    let raf = 0;
    const cuadro = (ms: number) => {
      const t = ms / 1000;
      malla.rotation.y += 0.0015;
      malla.rotation.x += (py * 0.3 - malla.rotation.x) * 0.05;
      malla.scale.setScalar(1 + Math.sin(t * 0.9) * 0.03);
      puntos.rotation.y -= 0.0006;
      camara.position.x += (px * 0.4 - camara.position.x) * 0.05;
      camara.lookAt(0, 0, 0);
      renderer.render(escena, camara);
      raf = requestAnimationFrame(cuadro);
    };
    const visibilidad = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && !reduce) raf = requestAnimationFrame(cuadro);
    };
    if (reduce) renderer.render(escena, camara);
    else raf = requestAnimationFrame(cuadro);
    document.addEventListener('visibilitychange', visibilidad);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', tam);
      window.removeEventListener('pointermove', puntero);
      document.removeEventListener('visibilitychange', visibilidad);
      geoMalla.dispose();
      matMalla.dispose();
      geoPuntos.dispose();
      matPuntos.dispose();
      renderer.dispose();
    };
  }, []);

  return <canvas ref={ref} aria-hidden className="h-full w-full" />;
}
