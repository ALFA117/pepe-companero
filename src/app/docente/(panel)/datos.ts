import 'server-only';
import { repositorio } from '@/motor/servidor';
import { calcularPanel, infoDeRetos } from '@/panel/calcular';
import { listarRetos } from '@/retos/cargar';

/** Grupo a mostrar: el pedido, o el que tiene más alumnos (el de demo, normalmente). */
export async function grupoElegido(pedido?: string) {
  const repo = repositorio();
  const grupos = await repo.grupos();
  if (grupos.length === 0) return { grupos, grupoId: null };
  if (pedido && grupos.some((g) => g.id === pedido)) return { grupos, grupoId: pedido };
  const tamanos = await Promise.all(
    grupos.map(async (g) => ({ id: g.id, n: (await repo.datosPanel(g.id))?.alumnos.length ?? 0 })),
  );
  tamanos.sort((a, b) => b.n - a.n);
  return { grupos, grupoId: tamanos[0]!.id };
}

export async function resumenDelGrupo(grupoId: string) {
  const datos = await repositorio().datosPanel(grupoId);
  if (!datos) return null;
  return calcularPanel(datos, infoDeRetos(listarRetos()));
}
