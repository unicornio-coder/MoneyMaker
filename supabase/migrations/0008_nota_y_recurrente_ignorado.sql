-- Nota del usuario por movimiento y "no es recurrente" (el detector no lo vuelve a crear).
alter table public.transactions add column if not exists nota text;
alter table public.recurrents add column if not exists ignorado boolean not null default false;
