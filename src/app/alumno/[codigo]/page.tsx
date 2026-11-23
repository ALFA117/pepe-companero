import Link from 'next/link';
import { pasoActual } from '@/motor/maquina';
import { repositorio } from '@/motor/servidor';
import { existeReto, obtenerReto } from '@/retos/cargar';
import { Chat, type MensajeChat } from './chat';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  return { title: 'Chat con Pepe' };
}

export default async function PaginaAlumno({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo: crudo } = await params;
  const codigo = decodeURIComponent(crudo).trim().toUpperCase();
  const repo = repositorio();
  const alumno = await repo.alumnoPorCodigo(codigo);

  if (!alumno) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-5xl" aria-hidden>
          🦎
        </p>
        <h1 className="text-xl font-semibold">No encontré el código {codigo}</h1>
        <p className="text-muted-foreground">Revisa que esté igual que el que te dio tu profe, por ejemplo PEPE-1B-07.</p>
        <Link href="/" className="font-medium text-primary underline underline-offset-4">
          Intentar con otro código
        </Link>
      </main>
    );
  }

  // Conversación de la sesión más reciente, para que al recargar no se pierda.
  const sesion = (await repo.sesionActiva(alumno.id)) ?? (await repo.ultimaSesion(alumno.id));
  const turnos = sesion ? await repo.ultimosTurnos(sesion.id, 60) : [];
  const historial: MensajeChat[] = turnos.map((t) => ({
    id: t.id,
    rol: t.rol,
    texto: t.texto,
    tipo: t.tipo,
  }));

  // Si lo último fue una pregunta de Pepe con opciones, se vuelven a mostrar.
  let botones: string[] = [];
  const ultimo = turnos.at(-1);
  if (sesion && sesion.fase === 'nivel' && ultimo?.rol === 'pepe' && existeReto(sesion.reto_id)) {
    botones = pasoActual(obtenerReto(sesion.reto_id), sesion)?.botones ?? [];
  }

  const nombre = alumno.nombre.split(' ')[0] ?? alumno.nombre;
  return <Chat codigo={codigo} nombre={nombre} historial={historial} botonesIniciales={botones} />;
}
