/**
 * Pepe dibujado como ajolote (Ambystoma mexicanum), la mascota del proyecto.
 * SVG propio: cabeza rosa, tres branquias por lado y cara de "me equivoqué".
 * Las branquias se mecen y parpadea (CSS en globals.css, se apaga con
 * prefers-reduced-motion).
 */
interface Props {
  className?: string;
  /** Animación sutil continua (branquias y parpadeo). */
  vivo?: boolean;
  /** Cara: normal o pensando (cejas y boca de duda). */
  cara?: 'feliz' | 'pensando';
  titulo?: string;
}

export function PepeAjolote({ className, vivo = false, cara = 'feliz', titulo }: Props) {
  return (
    <svg
      viewBox="0 0 120 100"
      className={`${vivo ? 'pepe-vivo' : ''} ${className ?? ''}`}
      role={titulo ? 'img' : undefined}
      aria-hidden={titulo ? undefined : true}
      aria-label={titulo}
    >
      {/* Branquias izquierda */}
      <g className="pepe-branquias-izq" style={{ transformOrigin: '30px 52px' }}>
        <path d="M30 46 C18 34 8 30 4 32 C10 36 18 42 26 50 Z" fill="var(--ajolote-branquia)" />
        <path d="M28 54 C14 50 4 52 1 56 C8 58 18 58 27 58 Z" fill="var(--ajolote-branquia)" />
        <path d="M30 62 C18 66 10 74 8 78 C15 76 22 70 31 66 Z" fill="var(--ajolote-branquia)" />
      </g>
      {/* Branquias derecha */}
      <g className="pepe-branquias-der" style={{ transformOrigin: '90px 52px' }}>
        <path d="M90 46 C102 34 112 30 116 32 C110 36 102 42 94 50 Z" fill="var(--ajolote-branquia)" />
        <path d="M92 54 C106 50 116 52 119 56 C112 58 102 58 93 58 Z" fill="var(--ajolote-branquia)" />
        <path d="M90 62 C102 66 110 74 112 78 C105 76 98 70 89 66 Z" fill="var(--ajolote-branquia)" />
      </g>
      {/* Cabeza */}
      <ellipse cx="60" cy="56" rx="34" ry="30" fill="var(--ajolote)" />
      <ellipse cx="60" cy="64" rx="24" ry="14" fill="var(--ajolote-panza)" opacity="0.7" />
      {/* Ojos */}
      <g className="pepe-ojos" style={{ transformOrigin: '60px 50px' }}>
        <circle cx="44" cy="50" r="5" fill="var(--ajolote-ojo)" />
        <circle cx="76" cy="50" r="5" fill="var(--ajolote-ojo)" />
        <circle cx="45.6" cy="48.4" r="1.6" fill="#fff" />
        <circle cx="77.6" cy="48.4" r="1.6" fill="#fff" />
      </g>
      {cara === 'pensando' && (
        <>
          <path d="M38 41 L49 43" stroke="var(--ajolote-ojo)" strokeWidth="2" strokeLinecap="round" />
          <path d="M71 43 L82 40" stroke="var(--ajolote-ojo)" strokeWidth="2" strokeLinecap="round" />
        </>
      )}
      {/* Cachetes */}
      <ellipse cx="38" cy="61" rx="5" ry="3" fill="var(--ajolote-branquia)" opacity="0.45" />
      <ellipse cx="82" cy="61" rx="5" ry="3" fill="var(--ajolote-branquia)" opacity="0.45" />
      {/* Boca */}
      {cara === 'feliz' ? (
        <path d="M50 62 Q60 71 70 62" stroke="var(--ajolote-ojo)" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      ) : (
        <path d="M51 65 Q56 62 60 65 T69 64" stroke="var(--ajolote-ojo)" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      )}
    </svg>
  );
}
