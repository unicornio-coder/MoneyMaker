-- Cancelación y negociación sin humanos: a quién se mandó la carta, cuándo dar seguimiento y el resultado.
alter table public.cancel_requests
  add column if not exists tipo text not null default 'cancelacion' check (tipo in ('cancelacion','negociacion')),
  add column if not exists enviado_a text,
  add column if not exists seguimiento date,
  add column if not exists precio_actual numeric,
  add column if not exists nuevo_precio numeric,
  add column if not exists ahorro_anual numeric,
  add column if not exists comision numeric;
