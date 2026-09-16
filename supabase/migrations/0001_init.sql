-- MoneyMaker · esquema inicial
-- Todas las tablas de usuario llevan user_id y RLS "solo el dueño".
-- Las fuentes (Belvo, importación, Gmail, manual) escriben en las mismas tablas.

create extension if not exists "pgcrypto";

-- ---------- Perfil ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  nombre text,
  dias_pago smallint[] not null default '{5,20}',
  ingreso_quincenal numeric(14,2),
  metas text[] not null default '{}',
  plan text not null default 'trial' check (plan in ('trial','premium','vencido')),
  trial_termina timestamptz not null default (now() + interval '7 days'),
  onboarding_completo boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, nombre)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'nombre', new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users for each row execute procedure public.handle_new_user();

-- ---------- Catálogo global ----------
create table public.categories (
  id text primary key,
  nombre text not null,
  color text not null,
  tipo text not null check (tipo in ('gasto','ingreso','transferencia')),
  orden smallint not null default 100
);

insert into public.categories (id, nombre, color, tipo, orden) values
  ('fijos','Fijos','#0B1F17','gasto',1),
  ('comida','Comida','#16A34A','gasto',2),
  ('super','Súper','#16A34A','gasto',3),
  ('transporte','Transporte','#2563EB','gasto',4),
  ('online','Compras en línea','#6366F1','gasto',5),
  ('entretenimiento','Entretenimiento','#6366F1','gasto',6),
  ('salud','Salud','#16A34A','gasto',7),
  ('servicios','Servicios','#0B1F17','gasto',8),
  ('suscripciones','Suscripciones','#0B1F17','gasto',9),
  ('msi','Meses sin intereses','#6366F1','gasto',10),
  ('colegiaturas','Colegiaturas','#0B1F17','gasto',11),
  ('comisiones','Comisiones e intereses','#2563EB','gasto',12),
  ('efectivo','Retiro de efectivo','#2563EB','gasto',13),
  ('viajes','Viajes','#2563EB','gasto',14),
  ('hogar','Hogar','#0B1F17','gasto',15),
  ('otros','Otros','#7A8C84','gasto',99),
  ('nomina','Nómina','#16A34A','ingreso',1),
  ('ingreso','Ingreso','#16A34A','ingreso',2),
  ('rendimiento','Rendimiento','#16A34A','ingreso',3),
  ('pago_tarjeta','Pago de tarjeta','#7A8C84','transferencia',1),
  ('transferencia','Transferencia','#7A8C84','transferencia',2),
  ('inversion','Aportación a inversión','#6366F1','transferencia',3);

-- Comercios: user_id null = diccionario global; con user_id = corrección del usuario.
create table public.merchants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  patron text not null,
  nombre text not null,
  dominio text,
  categoria_id text not null references public.categories (id),
  es_suscripcion boolean not null default false,
  fuente text not null default 'diccionario' check (fuente in ('diccionario','usuario','llm')),
  created_at timestamptz not null default now(),
  unique (user_id, patron)
);
create index merchants_patron_idx on public.merchants (patron);

-- ---------- Fuentes y cuentas ----------
create table public.links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  proveedor text not null check (proveedor in ('belvo','gmail','import','manual','bitso')),
  external_id text,
  institucion text not null,
  institucion_dominio text,
  estado text not null default 'ok' check (estado in ('ok','mfa','roto','pendiente')),
  ultimo_sync timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, proveedor, external_id)
);

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  link_id uuid references public.links (id) on delete set null,
  external_id text,
  nombre text not null,
  banco text not null,
  banco_dominio text,
  tipo text not null check (tipo in ('credito','debito','inversion','efectivo')),
  ultimos4 text,
  moneda text not null default 'MXN',
  saldo numeric(14,2) not null default 0,
  limite numeric(14,2),
  pago_minimo numeric(14,2),
  fecha_corte date,
  fecha_limite date,
  color text,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, external_id)
);
create index accounts_user_idx on public.accounts (user_id);

-- ---------- Movimientos ----------
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete cascade,
  external_id text,
  fecha date not null,
  descripcion_raw text not null,
  comercio text not null,
  comercio_dominio text,
  monto numeric(14,2) not null check (monto >= 0),
  tipo text not null check (tipo in ('gasto','ingreso','pago_tarjeta','transferencia')),
  categoria_id text not null references public.categories (id) default 'otros',
  categoria_fuente text not null default 'regla' check (categoria_fuente in ('regla','proveedor','llm','usuario')),
  es_msi boolean not null default false,
  msi_cuota smallint,
  msi_total smallint,
  recurrent_id uuid,
  fuente text not null check (fuente in ('belvo','import','gmail','manual','bitso')),
  hash text not null,
  created_at timestamptz not null default now(),
  unique (user_id, hash)
);
create index transactions_user_fecha_idx on public.transactions (user_id, fecha desc);
create index transactions_account_idx on public.transactions (account_id);

-- ---------- Recurrentes y MSI ----------
create table public.recurrents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  account_id uuid references public.accounts (id) on delete set null,
  nombre text not null,
  comercio_dominio text,
  tipo text not null check (tipo in ('suscripcion','servicio','msi','colegiatura','otro')),
  monto numeric(14,2) not null,
  dia_cobro smallint,
  frecuencia text not null default 'mensual' check (frecuencia in ('semanal','quincenal','mensual','anual')),
  primer_cargo date,
  ultimo_cargo date,
  veces integer not null default 1,
  activo boolean not null default true,
  cancelado_at timestamptz,
  msi_cuotas_total smallint,
  msi_cuotas_pagadas smallint,
  msi_termina date,
  categoria_id text references public.categories (id),
  origen text not null default 'detectado' check (origen in ('detectado','manual')),
  created_at timestamptz not null default now()
);
create index recurrents_user_idx on public.recurrents (user_id);
alter table public.transactions add constraint transactions_recurrent_fk foreign key (recurrent_id) references public.recurrents (id) on delete set null;

-- Tickets "Cancelar por mí"
create table public.cancel_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  recurrent_id uuid not null references public.recurrents (id) on delete cascade,
  estado text not null default 'pendiente' check (estado in ('pendiente','en_proceso','cancelada','no_posible')),
  notas text,
  created_at timestamptz not null default now()
);

-- ---------- Presupuesto ----------
create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  periodo text not null check (periodo in ('q','mes','anio')),
  inicio date not null,
  fin date not null,
  ingreso numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, periodo, inicio)
);

create table public.budget_lines (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references public.budgets (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  categoria_id text not null references public.categories (id),
  nombre text,
  limite numeric(14,2) not null default 0,
  orden smallint not null default 100,
  unique (budget_id, categoria_id)
);

-- ---------- Patrimonio y objetivos ----------
create table public.assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tipo text not null check (tipo in ('casa','auto','inversion','cripto','efectivo','otro')),
  nombre text not null,
  valor numeric(14,2) not null default 0,
  detalle jsonb not null default '{}',
  account_id uuid references public.accounts (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.liabilities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tipo text not null check (tipo in ('tarjeta','hipoteca','auto','personal','otro')),
  nombre text not null,
  saldo numeric(14,2) not null default 0,
  tasa numeric(6,2),
  account_id uuid references public.accounts (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  grupo text not null check (grupo in ('ahorro','deuda','inversion')),
  nombre text not null,
  meta numeric(14,2) not null,
  avance numeric(14,2) not null default 0,
  fecha date,
  account_id uuid references public.accounts (id) on delete set null,
  completado boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- Insights, calendario, importaciones ----------
create table public.insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tipo text not null,
  titulo text not null,
  texto text not null,
  monto numeric(14,2),
  cta_label text,
  cta_href text,
  leido boolean not null default false,
  descartado boolean not null default false,
  referencia jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index insights_user_idx on public.insights (user_id, created_at desc);

create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  fecha date not null,
  nombre text not null,
  monto numeric(14,2),
  tipo text not null default 'cargo' check (tipo in ('cargo','recordatorio','pago')),
  recurrent_id uuid references public.recurrents (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.statements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  account_id uuid references public.accounts (id) on delete set null,
  archivo text not null,
  banco text,
  estado text not null default 'subido' check (estado in ('subido','procesado','error')),
  transacciones integer not null default 0,
  error text,
  created_at timestamptz not null default now()
);

-- ---------- RLS ----------
alter table public.profiles enable row level security;
create policy "perfil propio" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);

alter table public.categories enable row level security;
create policy "categorias publicas" on public.categories for select to authenticated using (true);

alter table public.merchants enable row level security;
create policy "comercios globales o propios" on public.merchants for select to authenticated using (user_id is null or user_id = auth.uid());
create policy "comercios propios" on public.merchants for insert to authenticated with check (user_id = auth.uid());
create policy "comercios propios upd" on public.merchants for update to authenticated using (user_id = auth.uid());
create policy "comercios propios del" on public.merchants for delete to authenticated using (user_id = auth.uid());

do $$
declare t text;
begin
  foreach t in array array['links','accounts','transactions','recurrents','cancel_requests','budgets','budget_lines','assets','liabilities','goals','insights','calendar_events','statements']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "solo dueño" on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

-- Storage para estados de cuenta (privado, carpeta por usuario)
insert into storage.buckets (id, name, public) values ('estados', 'estados', false) on conflict do nothing;
create policy "estados propios" on storage.objects for all to authenticated
  using (bucket_id = 'estados' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'estados' and (storage.foldername(name))[1] = auth.uid()::text);
