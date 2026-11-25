import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Pepe, el compañero que se equivoca',
    short_name: 'Pepe',
    description: 'Demuéstrale a Pepe dónde se equivocó.',
    start_url: '/',
    display: 'standalone',
    background_color: '#e9f6f4',
    theme_color: '#1f8a86',
    lang: 'es-MX',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  };
}
