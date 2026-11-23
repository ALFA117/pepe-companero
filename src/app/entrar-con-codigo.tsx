'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

export function EntrarConCodigo() {
  const router = useRouter();
  const [codigo, setCodigo] = useState('');

  function entrar(e: FormEvent) {
    e.preventDefault();
    const c = codigo.trim().toUpperCase();
    if (c) router.push(`/alumno/${encodeURIComponent(c)}`);
  }

  return (
    <form onSubmit={entrar} className="space-y-3">
      <label htmlFor="codigo" className="block font-medium">
        Tu código
      </label>
      <div className="flex gap-2">
        <input
          id="codigo"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          placeholder="PEPE-1B-07"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          className="min-h-12 min-w-0 flex-1 rounded-xl border border-input bg-background px-4 font-mono text-[16px] uppercase outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button
          type="submit"
          disabled={!codigo.trim()}
          className="min-h-12 rounded-xl bg-primary px-5 font-semibold text-primary-foreground disabled:opacity-50"
        >
          Entrar
        </button>
      </div>
      <p className="text-sm text-muted-foreground">Te lo da tu profe. También puedes hablar con Pepe por WhatsApp.</p>
    </form>
  );
}
