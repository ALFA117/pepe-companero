import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { canalWhatsApp } from '@/canales';
import { exigirDocente } from '@/lib/docente';
import { descifrarTelefono } from '@/lib/telefono';
import { dependenciasMotor, repositorio } from '@/motor/servidor';
import { asignarReto } from '@/panel/asignar';
import { humanizar, infoDeRetos } from '@/panel/calcular';
import { listarRetos } from '@/retos/cargar';
import { EtiquetaEstado, PuntosAyuda } from '../../componentes';

export const metadata = { title: 'Alumno · Panel de Pepe' };

const FASES: Record<string, string> = {
  pendiente: 'Asignado, sin empezar',
  leyendo_texto: 'Leyendo el texto',
  nivel: 'En curso',
  cierre: 'Explicando',
  terminado: 'Terminado',
};

const MENSAJES_ASIGNAR: Record<string, string> = {
  enviado: 'Listo: Pepe ya le escribió por WhatsApp.',
  sin_whatsapp: 'Asignado. No tiene WhatsApp vinculado: lo verá al entrar a la web con su código.',
  ventana_cerrada:
    'Asignado. Pasaron más de 24 h desde su último mensaje, así que WhatsApp no deja escribirle primero: arrancará cuando el alumno escriba.',
  error_envio: 'Asignado, pero no se pudo enviar por WhatsApp. Arrancará cuando el alumno escriba.',
};

async function asignar(formData: FormData) {
  'use server';
  await exigirDocente();
  const alumnoId = String(formData.get('alumno_id'));
  const retoId = String(formData.get('reto_id'));
  let canal;
  try {
    canal = canalWhatsApp();
  } catch {
    canal = undefined;
  }
  const r = await asignarReto(
    { motor: dependenciasMotor(), canal, descifrarTelefono: (v) => descifrarTelefono(v) },
    alumnoId,
    retoId,
  );
  redirect(`/docente/alumno/${alumnoId}?asignado=${r.estado === 'enviado' ? 'enviado' : r.motivo}`);
}

function Bandera({ si, texto }: { si: boolean | null; texto: string }) {
  if (si === null) return null;
  return (
    <li className="flex items-center gap-2">
      <span
        aria-hidden
        className={`flex size-5 items-center justify-center rounded-full text-xs font-bold ${si ? 'bg-exito/20' : 'bg-peligro/15'}`}
      >
        {si ? '✓' : '✗'}
      </span>
      <span>
        {texto}
        <span className="sr-only">: {si ? 'sí' : 'no'}</span>
      </span>
    </li>
  );
}

export default async function DetalleAlumno({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sesion?: string; asignado?: string }>;
}) {
  await exigirDocente();
  const { id } = await params;
  const { sesion: sesionPedida, asignado } = await searchParams;
  const repo = repositorio();
  const alumno = await repo.alumnoPorId(id);
  if (!alumno) notFound();

  const retos = infoDeRetos(listarRetos());
  const sesiones = (await repo.sesionesDeAlumno(id)).filter((s) => s.fase !== 'pendiente' || s.id === sesionPedida);
  const pendientes = (await repo.sesionesDeAlumno(id)).filter((s) => s.fase === 'pendiente');
  const sesion = sesiones.find((s) => s.id === sesionPedida) ?? sesiones[0];
  const [turnos, final, fluidez] = sesion
    ? await Promise.all([repo.ultimosTurnos(sesion.id, 200), repo.evaluacionFinal(sesion.id), repo.fluidezDe(sesion.id)])
    : [[], null, null];

  // La explicación final es lo último que escribió el alumno en el cierre.
  const explicacion = final ? [...turnos].reverse().find((t) => t.rol === 'alumno')?.texto : undefined;
  const info = sesion ? retos.get(sesion.reto_id) : undefined;
  const estado = !sesion
    ? 'sin_empezar'
    : sesion.requiere_docente || (sesion.fase === 'nivel' && sesion.nivel === 4)
      ? 'atorado'
      : sesion.fase === 'terminado' && final?.resuelto && sesion.nivel_max <= 1
        ? 'avanzando'
        : 'con_ayuda';

  return (
    <div className="space-y-6">
      <div>
        <Link href="/docente" className="text-sm text-primary hover:underline">
          ← Volver al grupo
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">{alumno.nombre}</h1>
          <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-xs">{alumno.codigo}</span>
          <EtiquetaEstado estado={estado} />
          <span className="text-sm text-muted-foreground">{alumno.tel_hash ? 'WhatsApp vinculado' : 'Sin WhatsApp'}</span>
        </div>
      </div>

      {asignado && MENSAJES_ASIGNAR[asignado] && (
        <p role="status" className="rounded-xl bg-exito/15 p-3 text-sm">
          {MENSAJES_ASIGNAR[asignado]}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {sesion ? (
            <section className="space-y-4 rounded-xl border border-border bg-background p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-semibold">
                  {info?.titulo ?? sesion.reto_id}{' '}
                  <span className="font-normal text-muted-foreground">
                    · {info?.materia === 'lectura' ? 'Lectura' : 'Matemáticas'} · {FASES[sesion.fase]}
                  </span>
                </h2>
                <span className="text-sm">
                  Ayuda usada: <PuntosAyuda nivel={sesion.nivel_max} />
                </span>
              </div>

              {final && (
                <div className="space-y-3 rounded-lg bg-muted/50 p-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Explicación final</p>
                    <blockquote className="mt-1 border-l-4 border-primary pl-3 italic">“{explicacion ?? '—'}”</blockquote>
                  </div>
                  <ul className="grid gap-1.5 text-sm sm:grid-cols-2">
                    <Bandera si={final.resuelto} texto="Resolvió el reto" />
                    <Bandera si={final.explicacion_final.identifica_error} texto="Identifica el error" />
                    <Bandera si={final.explicacion_final.explica_por_que} texto="Explica por qué" />
                    <Bandera si={final.explicacion_final.usa_evidencia_textual} texto="Usa evidencia del texto" />
                  </ul>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Vocabulario:</span> {final.explicacion_final.vocabulario}
                    {final.estrategia_aprendida && (
                      <>
                        {' · '}
                        <span className="text-muted-foreground">Estrategia:</span> {final.estrategia_aprendida}
                      </>
                    )}
                  </p>
                  {final.brechas_detectadas.length > 0 && (
                    <p className="text-sm">
                      <span className="font-medium">Le falta…</span> {final.brechas_detectadas.map(humanizar).join(', ')}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">{final.comentario_docente}</p>
                </div>
              )}

              {sesion.requiere_docente && (
                <p className="rounded-lg bg-peligro/10 p-3 text-sm">
                  Llegó al nivel 4 de ayuda y no lo resolvió: conviene revisarlo en clase.
                </p>
              )}
              {sesion.contador_pide_respuesta > 0 && (
                <p className="text-sm text-muted-foreground">Pidió la respuesta {sesion.contador_pide_respuesta} veces.</p>
              )}

              {fluidez && (
                <div className="rounded-lg border border-border p-3 text-sm">
                  <p className="font-medium">Lectura en voz alta</p>
                  <dl className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <div>
                      <dt className="text-xs text-muted-foreground">Velocidad</dt>
                      <dd className="tabular-nums">{Math.round(fluidez.ppm)} ppm</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Precisión (estimada)</dt>
                      <dd className="tabular-nums">
                        {fluidez.precision_est === null ? '—' : `${Math.round(fluidez.precision_est * 100)} %`}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Pausas largas</dt>
                      <dd className="tabular-nums">{fluidez.pausas_largas}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Duración</dt>
                      <dd className="tabular-nums">{Math.round(fluidez.duracion_voz_s)} s</dd>
                    </div>
                  </dl>
                  <p className="mt-2 text-xs text-muted-foreground">
                    La precisión es estimada: la transcripción automática tiende a corregir algunos errores de lectura.
                  </p>
                </div>
              )}

              <details className="group" open={!final}>
                <summary className="cursor-pointer text-sm font-medium text-primary">Conversación completa ({turnos.length} mensajes)</summary>
                <ol className="mt-3 flex flex-col gap-1.5 rounded-lg bg-chat-fondo p-3">
                  {turnos.map((t) => (
                    <li
                      key={t.id}
                      className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-1.5 text-sm ${
                        t.rol === 'pepe' ? 'self-start bg-burbuja-pepe' : 'self-end bg-burbuja-alumno'
                      }`}
                    >
                      <span className="sr-only">{t.rol === 'pepe' ? 'Pepe: ' : 'Alumno: '}</span>
                      {t.tipo === 'audio' && <span aria-hidden>🎤 </span>}
                      {t.texto}
                    </li>
                  ))}
                </ol>
              </details>
            </section>
          ) : (
            <p className="rounded-xl border border-border bg-background p-6 text-center text-muted-foreground">
              Todavía no ha hecho ningún reto.
            </p>
          )}
        </div>

        <aside className="space-y-6">
          <section className="rounded-xl border border-border bg-background p-4">
            <h2 className="font-semibold">Asignar reto</h2>
            <p className="mb-3 text-sm text-muted-foreground">Crea una sesión nueva y Pepe le escribe por WhatsApp.</p>
            <form action={asignar} className="space-y-3">
              <input type="hidden" name="alumno_id" value={alumno.id} />
              <label htmlFor="reto_id" className="sr-only">
                Reto
              </label>
              <select id="reto_id" name="reto_id" className="min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm">
                {listarRetos().map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.materia === 'lectura' ? 'Lectura' : 'Mate'} · {retos.get(r.id)?.titulo} (dif. {r.dificultad})
                  </option>
                ))}
              </select>
              <button type="submit" className="min-h-11 w-full rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
                Asignar reto
              </button>
            </form>
            {pendientes.length > 0 && (
              <p className="mt-3 text-xs text-muted-foreground">
                Pendientes: {pendientes.map((p) => retos.get(p.reto_id)?.titulo ?? p.reto_id).join(', ')}
              </p>
            )}
          </section>

          <section className="rounded-xl border border-border bg-background p-4">
            <h2 className="mb-2 font-semibold">Retos</h2>
            <ul className="space-y-1">
              {sesiones.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/docente/alumno/${alumno.id}?sesion=${s.id}`}
                    className={`flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted ${s.id === sesion?.id ? 'bg-muted' : ''}`}
                  >
                    <span className="min-w-0 truncate">
                      {retos.get(s.reto_id)?.titulo ?? s.reto_id}
                      <span className="block text-xs text-muted-foreground">
                        {new Date(s.creado_en).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })} ·{' '}
                        {FASES[s.fase]}
                      </span>
                    </span>
                    <PuntosAyuda nivel={s.nivel_max} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
