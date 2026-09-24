-- Nuevas fuentes de movimientos: notificaciones del teléfono (app Android) y correo reenviado a una dirección propia.
alter table public.links drop constraint if exists links_proveedor_check;
alter table public.links add constraint links_proveedor_check check (proveedor in ('belvo','gmail','import','manual','bitso','dispositivo','correo'));
alter table public.transactions drop constraint if exists transactions_fuente_check;
alter table public.transactions add constraint transactions_fuente_check check (fuente in ('belvo','import','gmail','manual','bitso','dispositivo','correo'));
alter table public.credentials drop constraint if exists credentials_proveedor_check;
alter table public.credentials add constraint credentials_proveedor_check check (proveedor in ('gmail','bitso','dispositivo','correo'));
create index if not exists links_external_idx on public.links (proveedor, external_id);
