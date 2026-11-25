import { describe, expect, it } from 'vitest';
import { RepositorioMemoria } from '@/db/memoria';
import { RE_CODIGO } from '@/canales/atender';
import { crearVisitante, generarCodigoVisitante, GRUPO_VISITANTES } from './visitante';

describe('visitantes (probar sin código)', () => {
  it('el código tiene el formato de siempre y no usa letras confusas', () => {
    for (let i = 0; i < 200; i++) {
      const c = generarCodigoVisitante();
      expect(c).toMatch(/^PEPE-VIS-[A-HJ-KMNP-Z2-9]{5}$/);
      expect(c).toMatch(RE_CODIGO);
    }
  });

  it('crea el grupo de visitantes una sola vez y un alumno nuevo cada vez', async () => {
    const repo = new RepositorioMemoria();
    const a = await crearVisitante(repo);
    const b = await crearVisitante(repo);
    expect(a.codigo).not.toBe(b.codigo);
    expect(a.grupo_id).toBe(GRUPO_VISITANTES.id);
    expect(repo.datos.grupos.filter((g) => g.id === GRUPO_VISITANTES.id)).toHaveLength(1);
    expect(await repo.alumnoPorCodigo(a.codigo)).toMatchObject({ id: a.id, nombre: 'Visitante' });
  });

  it('si el código ya existe, prueba con otro', async () => {
    const repo = new RepositorioMemoria();
    const fijo = () => 0; // siempre "A"
    const primero = await crearVisitante(repo, fijo);
    let n = 0;
    const segundo = await crearVisitante(repo, () => (n++ < 5 ? 0 : 1));
    expect(primero.codigo).toBe('PEPE-VIS-AAAAA');
    expect(segundo.codigo).not.toBe(primero.codigo);
  });
});
