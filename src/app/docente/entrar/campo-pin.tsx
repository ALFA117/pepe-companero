'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

/** Campo del PIN con botón para mostrarlo u ocultarlo. */
export function CampoPin({ conError }: { conError: boolean }) {
  const [ver, setVer] = useState(false);
  return (
    <div className="relative">
      <input
        id="pin"
        name="pin"
        type={ver ? 'text' : 'password'}
        inputMode="numeric"
        autoComplete="current-password"
        required
        autoFocus
        aria-invalid={conError || undefined}
        aria-describedby={conError ? 'error-pin' : undefined}
        className="min-h-12 w-full rounded-2xl border-2 border-input bg-background/80 pr-14 pl-4 font-mono text-[18px] tracking-[0.4em] outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-ring/25 aria-[invalid]:border-peligro"
      />
      <button
        type="button"
        onClick={() => setVer((v) => !v)}
        aria-label={ver ? 'Ocultar PIN' : 'Mostrar PIN'}
        aria-pressed={ver}
        className="absolute top-1/2 right-1 flex size-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-xl text-muted-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {ver ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
      </button>
    </div>
  );
}
