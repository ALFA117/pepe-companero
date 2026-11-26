import type { MetadataRoute } from 'next';

const URL_SITIO = process.env.NEXT_PUBLIC_URL_SITIO ?? 'https://pepe-companero.vercel.app';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: URL_SITIO, changeFrequency: 'weekly', priority: 1 },
    { url: `${URL_SITIO}/demo`, changeFrequency: 'weekly', priority: 0.8 },
  ];
}
