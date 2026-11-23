-- Pepe, el compañero que se equivoca: esquema inicial
-- Se corre una sola vez en el SQL Editor de Supabase o con `supabase db push`.
--
-- Seguridad: todas las tablas tienen RLS activado y NO tienen políticas.
-- Así, las llaves públicas (anon / publishable) no pueden leer ni escribir nada.
-- Solo el servidor, con la service role / secret key, accede a los datos.

-- ─────────────────────────────────────────────────────────────
-- Utilidad: actualizar `actualizado_en` en cada UPDATE
-- ─────────────────────────────────────────────────────────────
create or replace function public.tocar_actualizado_en()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- grupos
-- ─────────────────────────────────────────────────────────────
create table public.grupos (
  id              uuid primary key default gen_random_uuid(),
  nombre          text not null,                 -- "1° B"
  escuela         text,
  docente_nombre  text,
  es_demo         boolean not null default false, -- datos de seed-demo
  creado_en       timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- alumnos
-- El teléfono NUNCA se guarda en claro:
--   tel_hash    = SHA-256(TEL_HASH_SALT + teléfono), para buscar al alumno
--   tel_cifrado = AES-256-GCM con TEL_CIFRADO_KEY, solo para "Asignar reto"
-- ─────────────────────────────────────────────────────────────
create table public.alumnos (
  id                   uuid primary key default gen_random_uuid(),
  grupo_id             uuid not null references public.grupos(id) on delete cascade,
  nombre               text not null,
  codigo               text not null unique,     -- "PEPE-1B-07"
  tel_hash             text unique,
  tel_cifrado          text,
  ultimo_mensaje_wa_en timestamptz,               -- para saber si sigue abierta la ventana de 24 h de WhatsApp
  creado_en            timestamptz not null default now(),
  constraint alumnos_codigo_formato check (codigo = upper(codigo)),
  constraint alumnos_tel_par check ((tel_hash is null) = (tel_cifrado is null))
);

create index alumnos_grupo_idx on public.alumnos (grupo_id);

-- ─────────────────────────────────────────────────────────────
-- sesiones: una por reto que intenta un alumno
-- fase:
--   pendiente      → asignada por el maestro, todavía no arranca (ventana de 24 h cerrada)
--   leyendo_texto  → reto de lectura esperando la nota de voz
--   nivel          → reto en curso (ver nivel y paso)
--   cierre         → ya resolvió; Pepe pide la explicación con sus palabras
--   terminado
-- version: bloqueo optimista. Cada transición hace
--   update ... set version = version + 1 where id = $1 and version = $2
-- ─────────────────────────────────────────────────────────────
create table public.sesiones (
  id                       uuid primary key default gen_random_uuid(),
  alumno_id                uuid not null references public.alumnos(id) on delete cascade,
  reto_id                  text not null,
  canal                    text not null,
  fase                     text not null,
  nivel                    int  not null default 0,
  paso                     int  not null default 0,
  nivel_max                int  not null default 0,
  pidio_justificacion      boolean not null default false,
  insistio_lectura         boolean not null default false,
  contador_pide_respuesta  int  not null default 0,
  requiere_docente         boolean not null default false,
  siguiente_reto_id        text,
  version                  int  not null default 0,
  creado_en                timestamptz not null default now(),
  actualizado_en           timestamptz not null default now(),
  constraint sesiones_canal_valido check (canal in ('web', 'whatsapp')),
  constraint sesiones_fase_valida check (fase in ('pendiente', 'leyendo_texto', 'nivel', 'cierre', 'terminado')),
  constraint sesiones_nivel_rango check (nivel between 0 and 4),
  constraint sesiones_nivel_max_rango check (nivel_max between 0 and 4 and nivel_max >= nivel),
  constraint sesiones_paso_positivo check (paso >= 0),
  constraint sesiones_contador_positivo check (contador_pide_respuesta >= 0)
);

create index sesiones_alumno_idx on public.sesiones (alumno_id, creado_en desc);
-- Para encontrar rápido la sesión activa de un alumno
create index sesiones_activas_idx on public.sesiones (alumno_id) where fase <> 'terminado';
-- Para el panel: "necesitan atención"
create index sesiones_requiere_docente_idx on public.sesiones (requiere_docente) where requiere_docente;

create trigger sesiones_tocar_actualizado_en
  before update on public.sesiones
  for each row execute function public.tocar_actualizado_en();

-- ─────────────────────────────────────────────────────────────
-- turnos: cada mensaje del alumno o de Pepe
-- mensaje_externo_id es unique → si WhatsApp/Kapso reenvía el mismo mensaje,
-- el insert falla y no se procesa dos veces (idempotencia).
-- ─────────────────────────────────────────────────────────────
create table public.turnos (
  id                  uuid primary key default gen_random_uuid(),
  sesion_id           uuid not null references public.sesiones(id) on delete cascade,
  rol                 text not null,
  tipo                text not null,
  texto               text not null,             -- si fue audio, aquí va la transcripción (el audio se borra)
  mensaje_externo_id  text unique,
  creado_en           timestamptz not null default now(),
  constraint turnos_rol_valido check (rol in ('alumno', 'pepe')),
  constraint turnos_tipo_valido check (tipo in ('texto', 'audio', 'boton'))
);

create index turnos_sesion_idx on public.turnos (sesion_id, creado_en);

-- ─────────────────────────────────────────────────────────────
-- evaluaciones: lo que dijo el Juez de cada respuesta del alumno
-- juez = objeto EvaluacionTurno completo (zod)
-- ─────────────────────────────────────────────────────────────
create table public.evaluaciones (
  id             uuid primary key default gen_random_uuid(),
  turno_id       uuid not null references public.turnos(id) on delete cascade,
  sesion_id      uuid not null references public.sesiones(id) on delete cascade,
  clasificacion  text not null,
  nivel          int  not null,
  paso           int  not null,
  juez           jsonb not null,
  creado_en      timestamptz not null default now(),
  constraint evaluaciones_clasificacion_valida check (clasificacion in (
    'correcta', 'paso_correcto', 'parcial', 'incorrecta', 'no_se', 'pide_respuesta', 'fuera_de_tema'
  )),
  constraint evaluaciones_nivel_rango check (nivel between 0 and 4)
);

create index evaluaciones_sesion_idx on public.evaluaciones (sesion_id, creado_en);
create index evaluaciones_turno_idx on public.evaluaciones (turno_id);

-- ─────────────────────────────────────────────────────────────
-- evaluaciones_finales: la evaluación del cierre (una por sesión)
-- juez = objeto EvaluacionFinal completo (brechas_detectadas, etc.)
-- ─────────────────────────────────────────────────────────────
create table public.evaluaciones_finales (
  sesion_id           uuid primary key references public.sesiones(id) on delete cascade,
  resuelto            boolean not null,
  nivel_ayuda_maximo  int not null,
  juez                jsonb not null,
  creado_en           timestamptz not null default now(),
  constraint evaluaciones_finales_nivel_rango check (nivel_ayuda_maximo between 0 and 4)
);

-- ─────────────────────────────────────────────────────────────
-- fluidez: métricas de la lectura en voz alta (solo las ve el maestro)
-- precision_est es ESTIMADA: la transcripción tiende a "corregir" errores.
-- ─────────────────────────────────────────────────────────────
create table public.fluidez (
  sesion_id               uuid primary key references public.sesiones(id) on delete cascade,
  palabras_texto          int not null,
  palabras_correctas_est  int,                   -- null si solo calculamos ppm
  duracion_voz_s          numeric(7,2) not null,
  ppm                     numeric(6,1) not null,
  pausas_largas           int not null default 0,
  precision_est           numeric(4,3),           -- 0.000 a 1.000; null si solo calculamos ppm
  creado_en               timestamptz not null default now(),
  constraint fluidez_precision_rango check (precision_est is null or precision_est between 0 and 1),
  constraint fluidez_valores_positivos check (palabras_texto > 0 and duracion_voz_s >= 0 and ppm >= 0 and pausas_largas >= 0)
);

-- ─────────────────────────────────────────────────────────────
-- Row Level Security: activado y sin políticas
-- ─────────────────────────────────────────────────────────────
alter table public.grupos               enable row level security;
alter table public.alumnos              enable row level security;
alter table public.sesiones             enable row level security;
alter table public.turnos               enable row level security;
alter table public.evaluaciones         enable row level security;
alter table public.evaluaciones_finales enable row level security;
alter table public.fluidez              enable row level security;
