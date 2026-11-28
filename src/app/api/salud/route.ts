/**
 * Ruta de salud para la plataforma de despliegue: contesta 200 sin tocar la
 * base de datos ni la IA, y sin autenticación. Solo dice que el servidor está
 * vivo y aceptando peticiones.
 */
export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}
