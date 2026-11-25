import Link from 'next/link';
import { PepeAjolote } from '@/components/pepe-ajolote';
import { pasoActual } from '@/motor/maquina';
import { repositorio } from '@/motor/servidor';
import { infoDeRetos } from '@/panel/calcular';
import { existeReto, listarRetos, obtenerReto } from '@/retos/cargar';
import { BOTON_NO_PUEDO_GRABAR } from '@/motor/pepe';
import { Chat, type MensajeChat } from './chat';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  return { title: 'Chat con Pepe', robots: { index: false, follow: false } };
}

/** Terminó hace menos de media hora: la tarjeta dice "¡Reto terminado!" en vez de "qué gusto verte". */
function terminoHacePoco(iso: string): boolean {
  return Date.now() - Date.parse(iso) < 30 * 60 * 1000;
}

export default async function PaginaAlumno({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo: crudo } = await params;
  const codigo = decodeURIComponent(crudo).trim().toUpperCase();
  const repo = repositorio();
  const alumno = await repo.alumnoPorCodigo(codigo);

  if (!alumno) {
    return (
      <main id="contenido" className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-4 py-10">
        <div className="tarjeta-clay flex w-full flex-col items-center gap-3 p-6 text-center">
          <PepeAjolote vivo cara="pensando" className="w-32" />
          <h1 className="texto-titulo text-2xl">No encontré el código <span className="font-mono text-primary">{codigo}</span></h1>
          <p className="text-muted-foreground">Revisa que esté igual que el que te dio tu profe, por ejemplo <span className="font-mono">PEPE-1B-07</span>.</p>
          <Link href="/" className="mt-2 inline-flex min-h-12 items-center rounded-2xl bg-primary px-5 font-extrabold text-primary-foreground shadow-boton focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40">
            Intentar con otro código
          </Link>
        </div>
      </main>
    );
  }

  // Conversación de la sesión más reciente, para que al recargar no se pierda.
  const activa = await repo.sesionActiva(alumno.id);
  const sesion = activa ?? (await repo.ultimaSesion(alumno.id));

  // Regresa después de terminar un reto (el siguiente quedó pendiente): se ve la
  // conversación que acaba de terminar y se le pregunta si quiere otro, en vez
  // de arrancarlo por sorpresa o mostrar un chat vacío.
  const anterior = activa?.fase === 'pendiente' ? await repo.ultimaSesionTerminada(alumno.id) : null;
  const entreRetos = Boolean(anterior);
  const recienTerminado = anterior ? terminoHacePoco(anterior.actualizado_en) : false;
  const mostrada = anterior ?? sesion;
  const turnos = [
    ...(anterior ? await repo.ultimosTurnos(anterior.id, 60) : []),
    ...(sesion ? await repo.ultimosTurnos(sesion.id, 60) : []),
  ];
  const historial: MensajeChat[] = turnos.map((t) => ({
    id: t.id,
    rol: t.rol,
    texto: t.texto,
    tipo: t.tipo,
  }));

  // Si lo último fue una pregunta de Pepe con opciones, se vuelven a mostrar.
  let botones: string[] = [];
  const ultimo = turnos.at(-1);
  if (sesion && ultimo?.rol === 'pepe' && existeReto(sesion.reto_id)) {
    if (sesion.fase === 'nivel') botones = pasoActual(obtenerReto(sesion.reto_id), sesion)?.botones ?? [];
    if (sesion.fase === 'leyendo_texto') botones = [BOTON_NO_PUEDO_GRABAR];
  }

  const nombre = alumno.nombre.split(' ')[0] ?? alumno.nombre;
  const info = mostrada ? infoDeRetos(listarRetos()).get(mostrada.reto_id) : undefined;
  const reto = info ? { titulo: info.titulo, materia: info.materia } : null;
  // Se vuelve a montar al cambiar de sesión (por ejemplo, al pasar al siguiente reto).
  return (
    <Chat
      key={sesion?.id ?? 'nueva'}
      codigo={codigo}
      nombre={nombre}
      historial={historial}
      botonesIniciales={botones}
      reto={reto}
      terminado={(sesion?.fase === 'terminado' && historial.length > 0) || entreRetos}
      entreRetos={entreRetos && !recienTerminado}
      faseInicial={mostrada?.fase ?? null}
      nivelInicial={mostrada?.nivel ?? 0}
    />
  );
}
