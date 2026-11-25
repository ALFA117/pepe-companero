'use client';

import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, History } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useSyncExternalStore, type FormEvent } from 'react';
import { Boton } from '@/components/boton';

const RE_CODIGO = /^PEPE-[A-Z0-9]{1,6}-[A-Z0-9]{1,6}$/;
const LLAVE = 'pepe:ultimo-codigo';

const sinSuscripcion = () => () => {};

function leerUltimo(): string | null {
  try {
    const c = localStorage.getItem(LLAVE);
    return c && RE_CODIGO.test(c) ? c : null;
  } catch {
    return null;
  }
}

export function EntrarConCodigo() {
  const router = useRouter();
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [yendo, setYendo] = useState(false);
  // localStorage solo existe en el navegador: en el servidor no hay código recordado.
  const ultimo = useSyncExternalStore(sinSuscripcion, leerUltimo, () => null);

  function ir(c: string) {
    try {
      localStorage.setItem(LLAVE, c);
    } catch {
      // sin almacenamiento: no pasa nada, solo no se recuerda
    }
    setYendo(true);
    router.push(`/alumno/${encodeURIComponent(c)}`);
  }

  function entrar(e: FormEvent) {
    e.preventDefault();
    const c = codigo.trim().toUpperCase().replace(/\s+/g, '');
    if (!c) {
      setError('Escribe primero el código que te dio tu profe (por ejemplo PEPE-1B-07).');
      return;
    }
    if (!RE_CODIGO.test(c)) {
      setError('El código se ve así: PEPE-1B-07. Revísalo con tu profe.');
      return;
    }
    setError(null);
    ir(c);
  }

  return (
    <form onSubmit={entrar} noValidate className="tarjeta-clay space-y-3 p-5">
      <AnimatePresence initial={false}>
        {ultimo && (
          <motion.button
            key="ultimo"
            type="button"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 22 }}
            onClick={() => ir(ultimo)}
            className="flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-2xl border-2 border-primary/30 bg-primary/10 px-4 text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40"
          >
            <History className="size-5 shrink-0 text-primary" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-extrabold">Seguir donde me quedé</span>
              <span className="block truncate font-mono text-xs text-muted-foreground">{ultimo}</span>
            </span>
            <ArrowRight className="size-4 shrink-0 text-primary" aria-hidden />
          </motion.button>
        )}
      </AnimatePresence>
      <ol className="flex flex-wrap gap-x-3 gap-y-1 text-[13px] font-bold text-muted-foreground" aria-label="Cómo empezar">
        {['Escribe tu código', 'Toca Entrar', 'Ayuda a Pepe'].map((paso, i) => (
          <li key={paso} className="inline-flex items-center gap-1.5">
            <span className="inline-flex size-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">{i + 1}</span>
            {paso}
          </li>
        ))}
      </ol>
      <label htmlFor="codigo" className="block text-base font-extrabold">
        {ultimo ? 'U otro código' : 'Tu código de alumno'}
      </label>
      <div className="flex flex-col gap-2 min-[400px]:flex-row">
        <input
          id="codigo"
          value={codigo}
          onChange={(e) => {
            setCodigo(e.target.value);
            if (error) setError(null);
          }}
          placeholder="PEPE-1B-07"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'codigo-error' : 'codigo-ayuda'}
          className="min-h-12 min-w-0 flex-1 rounded-2xl border-2 border-input bg-background/80 px-4 font-mono text-[17px] tracking-wider uppercase outline-none transition-colors placeholder:text-muted-foreground/70 focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-ring/25 aria-[invalid]:border-peligro"
        />
        <Boton type="submit" cargando={yendo}>
          Entrar <ArrowRight className="size-4" aria-hidden />
        </Boton>
      </div>
      {error ? (
        <p id="codigo-error" role="alert" className="text-sm font-semibold text-peligro">
          {error}
        </p>
      ) : (
        <p id="codigo-ayuda" className="text-sm text-muted-foreground">
          Te lo da tu profe. También puedes mandárselo a Pepe por WhatsApp.
        </p>
      )}
    </form>
  );
}
