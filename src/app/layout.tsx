import type { Metadata, Viewport } from 'next';
import { Fredoka, Geist_Mono, Nunito } from 'next/font/google';
import { FondoAmbiente } from '@/components/fondo-ambiente';
import { ProveedorMovimiento } from '@/components/proveedor-movimiento';
import './globals.css';

const fredoka = Fredoka({ variable: '--font-fredoka', subsets: ['latin'], weight: ['500', '600', '700'] });
const nunito = Nunito({ variable: '--font-nunito', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

const URL_SITIO = process.env.NEXT_PUBLIC_URL_SITIO ?? 'https://pepe-companero.vercel.app';
const DESCRIPCION =
  'Pepe es un ajolote de secundaria que siempre se equivoca. Tú le demuestras dónde está su error y tu profe ve cuánta ayuda necesitaste.';

export const metadata: Metadata = {
  metadataBase: new URL(URL_SITIO),
  title: { default: 'Pepe, el compañero que se equivoca', template: '%s · Pepe' },
  description: DESCRIPCION,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'es_MX',
    url: '/',
    siteName: 'Pepe',
    title: 'Pepe se equivocó. ¿Le ayudas?',
    description: DESCRIPCION,
  },
  twitter: { card: 'summary_large_image', title: 'Pepe se equivocó. ¿Le ayudas?', description: DESCRIPCION },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#e9f6f4' },
    { media: '(prefers-color-scheme: dark)', color: '#0f2027' },
  ],
  viewportFit: 'cover',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="es-MX" className={`${fredoka.variable} ${nunito.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-xl focus:bg-primary focus:px-4 focus:py-2 focus:font-bold focus:text-primary-foreground"
        >
          Saltar al contenido
        </a>
        <FondoAmbiente />
        <ProveedorMovimiento>{children}</ProveedorMovimiento>
      </body>
    </html>
  );
}
