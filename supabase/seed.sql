-- Datos mínimos para probar mientras desarrollamos (fases 3 a 5).
-- El grupo de demo grande (45 alumnos) lo crea scripts/seed-demo.ts en la Fase 7.
-- Se puede correr varias veces: no duplica nada.

insert into public.grupos (id, nombre, escuela, docente_nombre, es_demo)
values ('00000000-0000-0000-0000-000000000001', '1° B (pruebas)', 'Secundaria de prueba', 'Profe de prueba', false)
on conflict (id) do nothing;

insert into public.alumnos (grupo_id, nombre, codigo)
values
  ('00000000-0000-0000-0000-000000000001', 'Alumno Prueba 1', 'PEPE-1B-01'),
  ('00000000-0000-0000-0000-000000000001', 'Alumno Prueba 2', 'PEPE-1B-02'),
  ('00000000-0000-0000-0000-000000000001', 'Alumno Prueba 3', 'PEPE-1B-03')
on conflict (codigo) do nothing;
