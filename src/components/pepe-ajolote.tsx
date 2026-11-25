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
  /** Contorno grueso para el logo y los íconos (se lee mejor en tamaño chico). */
  marcado?: boolean;
}

/** Una branquia: tallo curvo que se adelgaza con flecos (fimbrias) a los lados. */
function Branquia({ x0, y0, cx, cy, x1, y1, grosor, flecos }: { x0: number; y0: number; cx: number; cy: number; x1: number; y1: number; grosor: number; flecos: number }) {
  const punto = (t: number) => ({
    x: (1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t ** 2 * x1,
    y: (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t ** 2 * y1,
  });
  const tangente = (t: number) => ({
    x: 2 * (1 - t) * (cx - x0) + 2 * t * (x1 - cx),
    y: 2 * (1 - t) * (cy - y0) + 2 * t * (y1 - cy),
  });
  const lineas: { x1: number; y1: number; x2: number; y2: number; w: number }[] = [];
  for (let i = 0; i < flecos; i++) {
    const t = 0.18 + (i / (flecos - 1)) * 0.78;
    const p = punto(t);
    const d = tangente(t);
    const l = Math.hypot(d.x, d.y) || 1;
    const ux = d.x / l;
    const uy = d.y / l;
    const largo = grosor * (2.5 - t * 1.1);
    for (const lado of [1, -1]) {
      // Los flecos salen inclinados hacia la punta, como plumas.
      lineas.push({
        x1: p.x,
        y1: p.y,
        x2: p.x + (-uy * lado * 0.82 + ux * 0.58) * largo,
        y2: p.y + (ux * lado * 0.82 + uy * 0.58) * largo,
        w: Math.max(0.9, grosor * 0.42 * (1 - t * 0.4)),
      });
    }
  }
  const camino = `M${x0} ${y0} Q${cx} ${cy} ${x1} ${y1}`;
  return (
    <g>
      {lineas.map((f, i) => (
        <line key={i} x1={f.x1} y1={f.y1} x2={f.x2} y2={f.y2} stroke="url(#pepe-branquia)" strokeWidth={f.w} strokeLinecap="round" />
      ))}
      <path d={camino} stroke="url(#pepe-branquia)" strokeWidth={grosor} strokeLinecap="round" fill="none" />
      <path d={camino} stroke="var(--ajolote-panza)" strokeOpacity="0.3" strokeWidth={grosor * 0.25} strokeLinecap="round" fill="none" />
    </g>
  );
}

/** Lado izquierdo; el derecho es su espejo. Salen de atrás de la cabeza y suben como corona. */
const BRANQUIAS = [
  { x0: 28, y0: 44, cx: 23, cy: 25, x1: 27, y1: 9, grosor: 4, flecos: 12 },
  { x0: 24, y0: 48, cx: 13, cy: 33, x1: 8, y1: 20, grosor: 4, flecos: 12 },
  { x0: 22, y0: 54, cx: 10, cy: 48, x1: 4, y1: 38, grosor: 3.8, flecos: 11 },
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

export function PepeAjolote({ className, vivo = false, cara = 'feliz', titulo, marcado = false }: Props) {
  const contorno = marcado
    ? { stroke: 'var(--ajolote-contorno)', strokeOpacity: 0.85, strokeWidth: 2.2 }
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
      <ellipse cx="60" cy="88" rx="20" ry="11" fill="var(--ajolote-sombra)" />
      <ellipse cx="60" cy="86" rx="17" ry="9" fill="var(--ajolote)" />
      <Pata />
      <g transform="translate(120 0) scale(-1 1)">
        <Pata />
      </g>

      <g className="pepe-branquias-izq" style={{ transformOrigin: '25px 48px' }}>
        {BRANQUIAS.map((b, i) => (
          <Branquia key={i} {...b} />
        ))}
      </g>
      <g className="pepe-branquias-der" style={{ transformOrigin: '95px 48px' }}>
        <g transform="translate(120 0) scale(-1 1)">
          {BRANQUIAS.map((b, i) => (
            <Branquia key={i} {...b} />
          ))}
        </g>
      </g>

      {/* Cabeza ancha y plana, como pala redondeada */}
      <path
        d="M60 37 C80 37 99 40 101 54 C103 68 92 82 60 82 C28 82 17 68 19 54 C21 40 40 37 60 37 Z"
        fill="url(#pepe-piel)"
        {...contorno}
      />
      {/* Brillo de la piel */}
      <ellipse cx="54" cy="44" rx="20" ry="4" fill="#fff" opacity="0.35" />
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
        {[33, 87].map((x) => (
          <g key={x}>
            <circle cx={x} cy="53" r="4.6" fill="var(--ajolote-panza)" opacity="0.7" />
            <circle cx={x} cy="53" r="3.4" fill="var(--ajolote-ojo)" />
            <circle cx={x + 1.1} cy="51.8" r="1.1" fill="#fff" />
          </g>
        ))}
      </g>
      {cara === 'pensando' && (
        <>
          <path d="M28 45.5 Q33 44 38 46" stroke="var(--ajolote-ojo)" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <path d="M82 46 Q87 43.5 92 45" stroke="var(--ajolote-ojo)" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        </>
      )}

      {/* Cachetes y fosas nasales */}
      <ellipse cx="30" cy="63" rx="7" ry="3.5" fill="url(#pepe-cachete)" />
      <ellipse cx="90" cy="63" rx="7" ry="3.5" fill="url(#pepe-cachete)" />
      <circle cx="55.5" cy="57" r="0.8" fill="var(--ajolote-ojo)" opacity="0.4" />
      <circle cx="64.5" cy="57" r="0.8" fill="var(--ajolote-ojo)" opacity="0.4" />

      {/* Boca ancha: la "sonrisa" natural del ajolote */}
      {cara === 'feliz' ? (
        <path d="M30 64 Q60 76 90 64" stroke="var(--ajolote-ojo)" strokeWidth="1.9" fill="none" strokeLinecap="round" />
      ) : (
        <path d="M36 67 Q48 64 60 67 T84 66" stroke="var(--ajolote-ojo)" strokeWidth="1.9" fill="none" strokeLinecap="round" />
      )}
    </svg>
  );
}
