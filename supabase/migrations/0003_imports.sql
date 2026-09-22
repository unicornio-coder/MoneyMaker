-- Importación de estados de cuenta por archivo (PDF hoy; correo y Belvo mañana por la misma interfaz).
-- El PDF nunca se guarda: aquí viven solo los datos extraídos y el hash del archivo para no procesarlo dos veces.

create table public.statement_imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  account_id uuid references public.accounts (id) on delete set null,
  archivo text not null,
  archivo_hash text not null,
  tamano_bytes integer not null default 0,
  estado text not null default 'subido' check (estado in ('subido','procesando','necesita_contraseña','revisar','confirmado','descartado','error')),
  metodo text check (metodo in ('claude-pdf','claude-texto','reglas','tabla')),
  resumen jsonb not null default '{}',
  movimientos jsonb not null default '[]',
  advertencias text[] not null default '{}',
  cuadre text check (cuadre in ('ok','sin_cuadre','sin_resumen')),
  insertados integer not null default 0,
  duplicados integer not null default 0,
  tokens_entrada integer not null default 0,
  tokens_salida integer not null default 0,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, archivo_hash)
);
create index statement_imports_user_idx on public.statement_imports (user_id, created_at desc);
alter table public.statement_imports enable row level security;
create policy "solo dueño" on public.statement_imports for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Descripciones que ninguna regla reconoció (y qué dijo el modelo). Sirven para mejorar categorias.json.
create table public.unmatched_descriptors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  descriptor text not null,
  veces integer not null default 1,
  comercio_llm text,
  categoria_llm text,
  created_at timestamptz not null default now(),
  unique (user_id, descriptor)
);
alter table public.unmatched_descriptors enable row level security;
create policy "solo dueño" on public.unmatched_descriptors for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
