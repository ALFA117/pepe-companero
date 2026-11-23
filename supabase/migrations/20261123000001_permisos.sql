-- Permisos para el servidor.
--
-- Los proyectos nuevos de Supabase ya no dan permisos automáticos sobre las
-- tablas creadas por SQL, así que la service role recibía
-- "permission denied for table ...". Aquí se los damos SOLO a service_role.
-- anon y authenticated (las llaves públicas) se quedan sin acceso.

grant usage on schema public to service_role;

grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

-- Para las tablas que agreguemos después.
alter default privileges in schema public
  grant select, insert, update, delete on tables to service_role;
alter default privileges in schema public
  grant usage, select on sequences to service_role;

-- Por si acaso: las llaves públicas no tocan nada.
revoke all on all tables in schema public from anon, authenticated;
