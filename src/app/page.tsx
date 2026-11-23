import Link from 'next/link';
import { EntrarConCodigo } from './entrar-con-codigo';

export default function Inicio() {
  return (
    <main className="flex min-h-dvh flex-col bg-chat-fondo">
      <section className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-4 py-12">
        <div className="space-y-4">
          <p className="text-6xl" aria-hidden>
            🦎
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-balance">Pepe se equivocó. ¿Le ayudas?</h1>
          <p className="text-lg text-muted-foreground text-pretty">
            Pepe es tu compa de secundaria. Hizo su tarea con un error y necesita que le demuestres dónde está. No te
            va a dar la respuesta: la tienes que encontrar tú.
          </p>
        </div>

        <EntrarConCodigo />

        <p className="text-sm text-muted-foreground">
          ¿Eres maestro?{' '}
          <Link href="/docente" className="font-medium text-primary underline underline-offset-4">
            Entra al panel
          </Link>
        </p>
      </section>
    </main>
  );
}
