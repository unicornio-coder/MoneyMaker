-- Planes Gratis y Plus. La prueba sigue siendo 'trial'; 'premium' pasa a 'plus' y 'vencido' a 'gratis' (nada se borra).
alter table public.profiles drop constraint if exists profiles_plan_check;
update public.profiles set plan = 'plus' where plan = 'premium';
update public.profiles set plan = 'gratis' where plan = 'vencido';
alter table public.profiles add constraint profiles_plan_check check (plan in ('trial', 'gratis', 'plus'));

-- Preferencias de avisos (bloque 4): resumen del domingo por correo y avisos de cobros próximos.
alter table public.profiles
  add column if not exists resumen_domingo boolean not null default true,
  add column if not exists avisos_cobros boolean not null default true;
