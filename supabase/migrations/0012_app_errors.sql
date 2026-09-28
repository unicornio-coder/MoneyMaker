-- Registro de errores (servidor y cliente). Sin políticas: solo el cliente de servicio lee y escribe.
create table public.app_errors (
  id uuid primary key default gen_random_uuid(),
  contexto text not null,
  nombre text,
  mensaje text not null,
  ruta text,
  digest text,
  user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index app_errors_created_idx on public.app_errors (created_at desc);
alter table public.app_errors enable row level security;
