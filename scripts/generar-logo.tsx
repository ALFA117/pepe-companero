/**
 * Genera el logo de Pepe (cabeza de ajolote) en SVG a partir del mismo
 * componente que usa la app, con colores fijos:
 *   - src/app/icon.svg (pestaña del navegador)
 *   - docs/logo/pepe-logo.svg y la plantilla de la imagen para compartir
 *
 *   pnpm exec tsx scripts/generar-logo.tsx
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { PepeAjolote } from '../src/components/pepe-ajolote';

const COLORES: Record<string, string> = {
  '--ajolote': '#f7b3c5',
  '--ajolote-panza': '#ffe1e9',
  '--ajolote-sombra': '#e98aa6',
  '--ajolote-branquia': '#e0457b',
  '--ajolote-branquia-oscura': '#b52361',
  '--ajolote-ojo': '#1f2233',
  '--ajolote-iris': '#4b3a5e',
  '--ajolote-contorno': '#7a1f45',
};

function conColores(svg: string) {
  return svg.replace(/var\((--[a-z-]+)\)/g, (_, v: string) => {
    const c = COLORES[v];
    if (!c) throw new Error(`Falta el color ${v}`);
    return c;
  });
}

/** Solo el contenido interno del SVG del componente (sin la etiqueta raíz). */
function cabeza(cara: 'feliz' | 'pensando' = 'feliz') {
  const svg = conColores(renderToStaticMarkup(<PepeAjolote cara={cara} marcado soloCabeza />));
  return svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
}

const logo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="fondo" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#2bb3a7"/><stop offset="100%" stop-color="#16857d"/></linearGradient>
    <radialGradient id="brillo" cx="30%" cy="22%" r="60%"><stop offset="0%" stop-color="#ffffff" stop-opacity=".22"/><stop offset="100%" stop-color="#ffffff" stop-opacity="0"/></radialGradient>
  </defs>
  <circle cx="256" cy="256" r="250" fill="url(#fondo)"/>
  <circle cx="256" cy="256" r="250" fill="url(#brillo)"/>
  <ellipse cx="256" cy="412" rx="132" ry="16" fill="#0d5f59" opacity=".35"/>
  <circle cx="404" cy="146" r="9" fill="#ffffff" opacity=".35"/>
  <circle cx="424" cy="178" r="5" fill="#ffffff" opacity=".3"/>
  <svg x="36" y="93" width="440" height="367" viewBox="0 0 120 100">${cabeza()}</svg>
</svg>`;

mkdirSync('docs/logo', { recursive: true });
writeFileSync('docs/logo/pepe-logo.svg', logo);
writeFileSync('src/app/icon.svg', logo);
// Versión cuadrada (iPhone y Android recortan las esquinas solos).
writeFileSync(
  'docs/logo/pepe-logo-cuadrado.svg',
  logo.replace('<circle cx="256" cy="256" r="248" fill="url(#fondo)"/>', '<rect width="512" height="512" fill="url(#fondo)"/>'),
);
writeFileSync('docs/logo/pepe-cabeza.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100">${cabeza()}</svg>`);
console.log('logo generado: src/app/icon.svg, docs/logo/pepe-logo.svg, docs/logo/pepe-cabeza.svg');
