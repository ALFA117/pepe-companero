import { ImageResponse } from 'next/og';

export const alt = 'Pepe se equivocó. ¿Le ayudas?';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Imagen() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '72px',
          background: 'linear-gradient(135deg, #e6f6f3 0%, #cdeee8 60%, #f9dde4 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 640 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#1f8a86', letterSpacing: 2 }}>TU COMPA DE 1° DE SECUNDARIA</div>
          <div style={{ fontSize: 84, fontWeight: 900, color: '#1d2a3a', lineHeight: 1.02, marginTop: 16 }}>Pepe se equivocó.</div>
          <div style={{ fontSize: 84, fontWeight: 900, color: '#1f8a86', lineHeight: 1.02 }}>¿Le ayudas?</div>
          <div style={{ fontSize: 30, color: '#3d4f63', marginTop: 24 }}>½ + ⅓ = ²⁄₅ … ¿seguro, Pepe?</div>
        </div>
        <svg width="360" height="300" viewBox="0 0 120 100">
          <g fill="#e0457b">
            <path d="M30 46 C18 34 8 30 4 32 C10 36 18 42 26 50 Z" />
            <path d="M28 54 C14 50 4 52 1 56 C8 58 18 58 27 58 Z" />
            <path d="M30 62 C18 66 10 74 8 78 C15 76 22 70 31 66 Z" />
            <path d="M90 46 C102 34 112 30 116 32 C110 36 102 42 94 50 Z" />
            <path d="M92 54 C106 50 116 52 119 56 C112 58 102 58 93 58 Z" />
            <path d="M90 62 C102 66 110 74 112 78 C105 76 98 70 89 66 Z" />
          </g>
          <ellipse cx="60" cy="56" rx="34" ry="30" fill="#f6b8c6" />
          <circle cx="44" cy="50" r="5" fill="#1d2433" />
          <circle cx="76" cy="50" r="5" fill="#1d2433" />
          <path d="M50 62 Q60 71 70 62" stroke="#1d2433" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        </svg>
      </div>
    ),
    size,
  );
}
