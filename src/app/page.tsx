import { BookOpenText, GraduationCap, MessageCircleQuestion, Mic, ShieldCheck, Sigma } from 'lucide-react';
import Link from 'next/link';
import { PepeAjolote } from '@/components/pepe-ajolote';
import { EntrarConCodigo } from './entrar-con-codigo';

const entrada = 'animate-in slide-in-from-bottom-4 fill-mode-both duration-500 ease-out motion-reduce:animate-none';

/** La "tarea" de Pepe con su error, como hoja de cuaderno. */
function TareaDePepe() {
  return (
    <div className="tarjeta-clay relative w-full max-w-[13.5rem] rotate-[-3deg] p-3 pl-5 md:max-w-[17rem] md:p-4 md:pl-6" aria-label="La tarea de Pepe: 1/2 + 1/3 = 2/5">
      <span className="absolute inset-y-3 left-3 w-0.5 rounded bg-ajolote-branquia/40" aria-hidden />
      <p className="eyebrow text-muted-foreground">Tarea de Pepe</p>
      <p className="mt-2 font-mono text-lg leading-none font-bold whitespace-nowrap min-[380px]:text-xl md:text-[1.6rem]">
        1/2 + 1/3 ={' '}
        <span className="relative inline-block px-1 text-peligro">
          2/5
          <svg viewBox="0 0 100 50" preserveAspectRatio="none" className="absolute -inset-x-2 -inset-y-2 h-[calc(100%+1rem)] w-[calc(100%+1rem)]" aria-hidden>
            <ellipse cx="50" cy="25" rx="46" ry="21" fill="none" stroke="currentColor" strokeWidth="2.5" strokeDasharray="6 4" />
          </svg>
        </span>
      </p>
      <p className="mt-2 text-sm text-muted-foreground">“Sumé los de arriba y los de abajo 😎”</p>
    </div>
  );
}

const PASOS = [
  {
    icono: MessageCircleQuestion,
    titulo: 'Pepe se equivoca',
    texto: 'Te enseña su tarea con un error típico de secundaria, en matemáticas o en lectura.',
    tono: 'bg-ajolote/40 text-ajolote-branquia',
  },
  {
    icono: Sigma,
    titulo: 'Tú lo corriges',
    texto: 'Le explicas dónde está el error. Si te atoras, Pepe te va dando pistas, nunca la respuesta.',
    tono: 'bg-primary/15 text-primary',
  },
  {
    icono: GraduationCap,
    titulo: 'Tu profe ve tu avance',
    texto: 'Cuánta ayuda necesitaste es tu diagnóstico. Así tu profe sabe qué repasar en clase.',
    tono: 'bg-trajinera/35 text-trajinera-tinta',
  },
];

export default function Inicio() {
  return (
    <main id="contenido" className="flex min-h-dvh flex-col overflow-x-clip">
      <section className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-6 px-4 pt-6 pb-12 md:gap-10 sm:px-6 md:grid-cols-[1.1fr_0.9fr] md:pt-16">
        <div className="min-w-0 space-y-6">
          <p className={`${entrada} eyebrow inline-flex items-center gap-2 rounded-full bg-card/80 px-3 py-1.5 text-primary shadow-clay`}>
            <span className="size-2 rounded-full bg-ajolote-branquia" aria-hidden />
            Tu compa de 1° de secundaria
          </p>
          <h1 className={`${entrada} texto-display text-[2.75rem] text-balance delay-75 sm:text-6xl lg:text-7xl`}>
            Pepe se equivocó.{' '}
            <span className="text-primary">¿Le ayudas?</span>
          </h1>
          <p className={`${entrada} max-w-xl text-lg text-pretty text-muted-foreground delay-150`}>
            Pepe es un ajolote de Xochimilco que hizo su tarea con un error. Demuéstrale dónde se equivocó. No te va a dar
            la respuesta: la tienes que encontrar tú.
          </p>
          <div className={`${entrada} max-w-xl delay-200`}>
            <EntrarConCodigo />
          </div>
          <p className={`${entrada} text-sm text-muted-foreground delay-300`}>
            ¿Eres maestro?{' '}
            <Link href="/docente" className="inline-flex min-h-11 items-center rounded font-bold text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              Entra al panel
            </Link>
          </p>
        </div>

        <div className={`${entrada} relative order-first mx-auto flex w-full max-w-md flex-row items-center justify-center delay-150 md:order-none md:flex-col md:gap-4`}>
          <div className="pepe-flota relative shrink-0">
            <div className="absolute inset-x-4 bottom-0 h-5 rounded-full bg-primary/20 blur-md" aria-hidden />
            <PepeAjolote vivo cara="feliz" titulo="Pepe, el ajolote" className="relative w-20 min-[380px]:w-28 sm:w-44 md:w-72" />
          </div>
          <div className="-ml-2 min-w-0 md:-mt-6 md:mr-[-1rem] md:ml-0 md:self-end">
            <TareaDePepe />
          </div>
        </div>
      </section>

      <section aria-labelledby="como-funciona" className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6">
        <h2 id="como-funciona" className="texto-titulo mb-6 text-2xl sm:text-3xl">
          ¿Cómo funciona?
        </h2>
        <ol className="grid gap-4 md:grid-cols-3">
          {PASOS.map((p, i) => (
            <li
              key={p.titulo}
              className={`tarjeta-clay flex gap-4 p-5 transition-transform duration-200 hover:-translate-y-1 motion-reduce:hover:translate-y-0 ${i === 1 ? 'md:translate-y-4' : ''}`}
            >
              <span className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${p.tono}`}>
                <p.icono className="size-6" aria-hidden />
              </span>
              <div>
                <p className="eyebrow text-muted-foreground">Paso {i + 1}</p>
                <h3 className="texto-titulo text-xl">{p.titulo}</h3>
                <p className="mt-1 text-[15px] text-muted-foreground">{p.texto}</p>
              </div>
            </li>
          ))}
        </ol>
        <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground">
          <li className="inline-flex items-center gap-2">
            <BookOpenText className="size-4 text-primary" aria-hidden /> 10 retos de matemáticas y lectura
          </li>
          <li className="inline-flex items-center gap-2">
            <Mic className="size-4 text-primary" aria-hidden /> Lectura en voz alta: el audio no se guarda
          </li>
          <li className="inline-flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" aria-hidden /> Tu teléfono nunca se guarda en claro
          </li>
        </ul>
      </section>
    </main>
  );
}
