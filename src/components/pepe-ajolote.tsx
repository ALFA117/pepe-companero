/**
 * Pepe, ajolote (Ambystoma mexicanum) leucístico visto de frente.
 * Dibujado a partir de fotos reales: cabeza ancha y plana (como pala), ojos
 * pequeños y muy separados, boca ancha con la "sonrisa" natural, tres pares de
 * branquias que salen de la parte de atrás de la cabeza y suben como corona,
 * cada una con muchos flecos, y las patitas delanteras de cuatro dedos.
 * Colores por variables CSS (claro/oscuro); el logo usa la misma figura con
 * colores fijos. Branquias que se mecen y parpadeo en globals.css (se apagan
 * con prefers-reduced-motion).
 */
interface Props {
  className?: string;
  /** Animación sutil continua (branquias y parpadeo). */
  vivo?: boolean;
  /** Cara: normal o pensando (cejas y boca de duda). */
  cara?: 'feliz' | 'pensando';
  titulo?: string;
  /** Contorno más marcado para el logo y los íconos (se lee mejor en tamaño chico). */
  marcado?: boolean;
  /** Sin cuerpo ni patitas (el logo es solo la cabeza). */
  soloCabeza?: boolean;
}

/**
 * Una branquia esponjosa: tallo curvo con "bolitas" redondas a los lados que
 * forman la fronda suave del ajolote (sin puntas), y una vena clara.
 */
function Branquia({ x0, y0, cx, cy, x1, y1, grosor, flecos }: { x0: number; y0: number; cx: number; cy: number; x1: number; y1: number; grosor: number; flecos: number }) {
  const punto = (t: number) => ({
    x: (1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t ** 2 * x1,
    y: (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t ** 2 * y1,
  });
  const normal = (t: number) => {
    const dx = 2 * (1 - t) * (cx - x0) + 2 * t * (x1 - cx);
    const dy = 2 * (1 - t) * (cy - y0) + 2 * t * (y1 - cy);
    const l = Math.hypot(dx, dy) || 1;
    return { x: -dy / l, y: dx / l };
  };
  const bolitas: { x: number; y: number; r: number }[] = [];
  for (let k = 0; k < flecos; k++) {
    const t = 0.2 + (k / (flecos - 1)) * 0.78;
    const p = punto(t);
    const n = normal(t);
    const r = grosor * (1.05 - t * 0.45);
    const sep = grosor * (0.95 - t * 0.35);
    bolitas.push({ x: p.x + n.x * sep, y: p.y + n.y * sep, r }, { x: p.x - n.x * sep, y: p.y - n.y * sep, r });
  }
  const fin = punto(1);
  const vena = `M${x0} ${y0} Q${cx} ${cy} ${x1} ${y1}`;
  return (
    <g>
      <g fill="url(#pepe-branquia)" stroke="var(--ajolote-branquia-oscura)" strokeOpacity="0.15" strokeWidth="0.4">
        {bolitas.map((b, i) => (
          <circle key={i} cx={b.x.toFixed(2)} cy={b.y.toFixed(2)} r={b.r.toFixed(2)} />
        ))}
        <circle cx={fin.x} cy={fin.y} r={grosor * 0.62} />
      </g>
      <path d={vena} stroke="url(#pepe-branquia)" strokeWidth={grosor * 0.9} strokeLinecap="round" fill="none" />
      <path d={vena} stroke="var(--ajolote-panza)" strokeOpacity="0.5" strokeWidth={grosor * 0.22} strokeLinecap="round" fill="none" />
    </g>
  );
}

/** Lado izquierdo; el derecho es su espejo. Salen de atrás de la cabeza y suben como corona. */
const BRANQUIAS = [
  { x0: 32, y0: 42, cx: 28, cy: 26, x1: 31, y1: 11, grosor: 3.3, flecos: 8 },
  { x0: 27, y0: 46, cx: 17, cy: 34, x1: 11, y1: 22, grosor: 3.3, flecos: 8 },
  { x0: 24, y0: 53, cx: 13, cy: 49, x1: 6, y1: 40, grosor: 3.1, flecos: 7 },
];

/** Patita delantera con cuatro dedos (lado izquierdo). */
function Pata() {
  return (
    <g>
      <path d="M44 84 C39 88 35 91 31 93" stroke="var(--ajolote)" strokeWidth="6" strokeLinecap="round" fill="none" />
      <path d="M44 84 C39 88 35 91 31 93" stroke="var(--ajolote-sombra)" strokeOpacity="0.5" strokeWidth="1" strokeLinecap="round" fill="none" />
      {[
        [31, 93, 25.5, 92.5],
        [31, 93, 26, 97],
        [31, 93, 30, 98.5],
        [31, 93, 34, 97.5],
      ].map(([a, b, c, d], i) => (
        <line key={i} x1={a} y1={b} x2={c} y2={d} stroke="var(--ajolote)" strokeWidth="2.4" strokeLinecap="round" />
      ))}
    </g>
  );
}

export function PepeAjolote({ className, vivo = false, cara = 'feliz', titulo, marcado = false, soloCabeza = false }: Props) {
  const contorno = marcado
    ? { stroke: 'var(--ajolote-contorno)', strokeOpacity: 0.55, strokeWidth: 1.4 }
    : { stroke: 'var(--ajolote-branquia)', strokeOpacity: 0.4, strokeWidth: 1.1 };
  return (
    <svg
      viewBox="0 0 120 100"
      className={`${vivo ? 'pepe-vivo' : ''} ${className ?? ''}`}
      role={titulo ? 'img' : undefined}
      aria-hidden={titulo ? undefined : true}
      aria-label={titulo}
    >
      <defs>
        <radialGradient id="pepe-piel" cx="50%" cy="35%" r="75%">
          <stop offset="0%" stopColor="var(--ajolote-panza)" />
          <stop offset="60%" stopColor="var(--ajolote)" />
          <stop offset="100%" stopColor="var(--ajolote-sombra)" />
        </radialGradient>
        <linearGradient id="pepe-branquia" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="var(--ajolote-branquia-oscura)" />
          <stop offset="100%" stopColor="var(--ajolote-branquia)" />
        </linearGradient>
        <radialGradient id="pepe-cachete" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--ajolote-branquia)" stopOpacity="0.4" />
          <stop offset="100%" stopColor="var(--ajolote-branquia)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Cuerpo y patitas delanteras (detrás de la cabeza) */}
      {!soloCabeza && (
        <>
          <ellipse cx="60" cy="88" rx="20" ry="11" fill="var(--ajolote-sombra)" />
          <ellipse cx="60" cy="86" rx="17" ry="9" fill="var(--ajolote)" />
          <Pata />
          <g transform="translate(120 0) scale(-1 1)">
            <Pata />
          </g>
        </>
      )}

      <g className="pepe-branquias-izq" style={{ transformOrigin: '28px 47px' }}>
        {BRANQUIAS.map((b, i) => (
          <Branquia key={i} {...b} />
        ))}
      </g>
      <g className="pepe-branquias-der" style={{ transformOrigin: '92px 47px' }}>
        <g transform="translate(120 0) scale(-1 1)">
          {BRANQUIAS.map((b, i) => (
            <Branquia key={i} {...b} />
          ))}
        </g>
      </g>

      {/* Cabeza ancha y plana, como pala redondeada */}
      <path
        d="M60 33 C80 33 96 39 98 54 C100 69 88 82 60 82 C32 82 20 69 22 54 C24 39 40 33 60 33 Z"
        fill="url(#pepe-piel)"
        {...contorno}
      />
      {/* Brillo de la piel */}
      <ellipse cx="54" cy="41" rx="18" ry="4.5" fill="#fff" opacity="0.35" />
      {/* Manchitas */}
      <g fill="var(--ajolote-branquia)" opacity="0.2">
        <circle cx="48" cy="47" r="0.9" />
        <circle cx="70" cy="46" r="1" />
        <circle cx="60" cy="43.5" r="0.8" />
        <circle cx="78" cy="51" r="0.7" />
        <circle cx="42" cy="52" r="0.7" />
      </g>

      {/* Ojos pequeños y muy separados */}
      <g className="pepe-ojos" style={{ transformOrigin: '60px 53px' }}>
        {[37, 83].map((x) => (
          <g key={x}>
            <circle cx={x} cy="53" r="5.4" fill="var(--ajolote-panza)" opacity="0.7" />
            <circle cx={x} cy="53" r="4.1" fill="var(--ajolote-ojo)" />
            <circle cx={x + 1.4} cy="51.5" r="1.4" fill="#fff" />
            <circle cx={x - 1.3} cy="54.6" r="0.6" fill="#fff" opacity="0.8" />
          </g>
        ))}
      </g>
      {cara === 'pensando' && (
        <>
          <path d="M32 45 Q37 43.5 42 45.5" stroke="var(--ajolote-ojo)" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <path d="M78 45.5 Q83 43 88 44.5" stroke="var(--ajolote-ojo)" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        </>
      )}

      {/* Cachetes y fosas nasales */}
      <ellipse cx="33" cy="63" rx="7" ry="3.8" fill="url(#pepe-cachete)" />
      <ellipse cx="87" cy="63" rx="7" ry="3.8" fill="url(#pepe-cachete)" />
      <circle cx="55.5" cy="57" r="0.8" fill="var(--ajolote-ojo)" opacity="0.4" />
      <circle cx="64.5" cy="57" r="0.8" fill="var(--ajolote-ojo)" opacity="0.4" />

      {/* Boca ancha: la "sonrisa" natural del ajolote */}
      {cara === 'feliz' ? (
        <path d="M40 64 Q60 77 80 64" stroke="var(--ajolote-ojo)" strokeWidth="2.1" fill="none" strokeLinecap="round" />
      ) : (
        <path d="M36 67 Q48 64 60 67 T84 66" stroke="var(--ajolote-ojo)" strokeWidth="1.9" fill="none" strokeLinecap="round" />
      )}
    </svg>
  );
}
