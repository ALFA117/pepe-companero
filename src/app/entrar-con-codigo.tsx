'use client';

import { ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Boton } from '@/components/boton';

const RE_CODIGO = /^PEPE-[A-Z0-9]{1,6}-[A-Z0-9]{1,6}$/;

export function EntrarConCodigo() {
  const router = useRouter();
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [yendo, setYendo] = useState(false);

  function entrar(e: FormEvent) {
    e.preventDefault();
    const c = codigo.trim().toUpperCase().replace(/\s+/g, '');
    if (!RE_CODIGO.test(c)) {
      setError('El código se ve así: PEPE-1B-07. Revísalo con tu profe.');
      return;
    }
    setError(null);
    setYendo(true);
    router.push(`/alumno/${encodeURIComponent(c)}`);
  }

  return (
    <form onSubmit={entrar} noValidate className="tarjeta-clay space-y-3 p-5">
      <label htmlFor="codigo" className="block text-base font-extrabold">
        Tu código de alumno
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
        <Boton type="submit" cargando={yendo} disabled={!codigo.trim()}>
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
