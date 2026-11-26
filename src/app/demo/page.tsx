import type { Metadata } from 'next';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { PepeAjolote } from '@/components/pepe-ajolote';
import { VideosDemo, type VideoDemo } from './videos';

export const metadata: Metadata = {
  title: 'Videos de Pepe',
  description: 'Mira a Pepe en acción: el reel, el video del proyecto y la demo de la app.',
  alternates: { canonical: '/demo' },
  openGraph: {
    title: 'Pepe, el compañero que se equivoca · Videos',
    description: 'El reel, el video del proyecto y la demo de la app. Elige cuál quieres ver.',
    url: '/demo',
    images: [{ url: '/demo/proyecto-poster.jpg', width: 1280, height: 720, alt: 'Pepe, el ajolote que hace la tarea mal para que tú le enseñes' }],
  },
  twitter: { card: 'summary_large_image', images: ['/demo/proyecto-poster.jpg'] },
};

const VIDEOS: VideoDemo[] = [
  {
    id: 'proyecto',
    titulo: 'El proyecto en 3 minutos',
    descripcion: 'El problema, la idea y cómo funciona, con dos pausas para que tú contestes antes que Pepe.',
    etiqueta: 'Video del proyecto',
    duracion: '2:58',
    vertical: false,
    poster: '/demo/proyecto-poster.jpg',
    mp4: '/demo/proyecto.mp4',
    preview: '/demo/proyecto-preview.mp4',
    icono: 'youtube',
  },
  {
    id: 'app',
    titulo: 'Demo de la app',
    descripcion: 'Un recorrido por la app real: el chat con Pepe, WhatsApp y el panel del maestro.',
    etiqueta: 'Demo de la app',
    duracion: '3:01',
    vertical: false,
    poster: '/demo/app-poster.jpg',
    youtube: 'ptNgbdpfXCk',
    icono: 'app',
  },
  {
    id: 'reel',
    titulo: 'Pepe en 80 segundos',
    descripcion: 'El reel: Pepe se equivoca, tú lo corriges y el maestro ve tu nivel real.',
    etiqueta: 'Reel',
    duracion: '1:20',
    vertical: true,
    poster: '/demo/reel-poster.jpg',
    mp4: '/demo/reel.mp4',
    preview: '/demo/reel-preview.mp4',
    icono: 'reel',
  },
];

export default function PaginaDemo() {
  return (
    <main id="contenido" className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-8 px-4 py-6 sm:px-6 md:py-10">
      <Link
        href="/"
        className="inline-flex min-h-11 w-fit items-center gap-2 rounded-xl text-sm font-bold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="size-4" aria-hidden /> Volver al inicio
      </Link>

      <header className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
        <PepeAjolote vivo cara="feliz" titulo="Pepe, el ajolote" className="w-24 shrink-0 sm:w-28" />
        <div>
          <p className="eyebrow text-primary">Videos</p>
          <h1 className="texto-display text-4xl text-balance sm:text-5xl">Mira a Pepe en acción</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Elige qué quieres ver y toca su tarjeta. En la compu, pasa el mouse para ver una probadita.
          </p>
        </div>
      </header>

      <VideosDemo videos={VIDEOS} />

      <section className="tarjeta-clay flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:text-left">
        <div className="flex-1">
          <h2 className="texto-titulo text-2xl">¿Le ayudas tú también?</h2>
          <p className="text-muted-foreground">Prueba a Pepe con tu código o sin código, en el celular o la compu.</p>
        </div>
        <Link
          href="/#codigo"
          className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-primary px-5 font-extrabold text-primary-foreground shadow-boton transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40"
        >
          Probar a Pepe <ArrowRight className="size-4" aria-hidden />
        </Link>
      </section>
    </main>
  );
}
