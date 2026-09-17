-- Fase 2: credenciales cifradas (Gmail, Bitso), eventos de producto y cobro con Stripe.

-- Credenciales de conectores del usuario. `datos` va cifrado en la app (AES-GCM con CREDENTIALS_KEY); la BD nunca ve el token.
create table public.credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  proveedor text not null check (proveedor in ('gmail','bitso')),
  etiqueta text,
  datos text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, proveedor)
);
alter table public.credentials enable row level security;
create policy "solo dueño" on public.credentials for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Eventos de producto (activación, wow, retención). Solo inserta el dueño; se leen con el cliente de servicio.
create table public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  nombre text not null,
  props jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index events_nombre_idx on public.events (nombre, created_at desc);
alter table public.events enable row level security;
create policy "insertar propios" on public.events for insert to authenticated with check (user_id = auth.uid() or user_id is null);

-- Stripe
alter table public.profiles
  add column stripe_customer_id text unique,
  add column stripe_subscription_id text,
  add column plan_renueva timestamptz,
  add column plan_intervalo text check (plan_intervalo in ('mes','anio'));

-- Lista de espera de la landing (sin sesión)
create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  origen text,
  created_at timestamptz not null default now()
);
alter table public.waitlist enable row level security;
