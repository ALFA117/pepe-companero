import type { MetadataRoute } from 'next';

const URL_SITIO = process.env.NEXT_PUBLIC_URL_SITIO ?? 'https://pepe-companero.vercel.app';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/docente', '/alumno', '/api'] },
    sitemap: `${URL_SITIO}/sitemap.xml`,
  };
}
