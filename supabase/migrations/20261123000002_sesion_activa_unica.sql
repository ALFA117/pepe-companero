-- Una sola sesión activa (no terminada) por alumno.
--
-- Si llegan dos mensajes al mismo tiempo de un alumno sin sesión, los dos
-- intentarían crear una; con este índice el segundo falla (23505) y el
-- servidor usa la sesión que ganó. "Asignar reto" cierra la activa antes de
-- crear la nueva.
drop index if exists public.sesiones_activas_idx;
create unique index sesiones_una_activa_idx on public.sesiones (alumno_id) where fase <> 'terminado';
