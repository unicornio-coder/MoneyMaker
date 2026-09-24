-- Nueva fuente: alertas y recibos leídos de Outlook / Hotmail (Microsoft Graph).
alter table public.links drop constraint if exists links_proveedor_check;
alter table public.links add constraint links_proveedor_check check (proveedor in ('belvo','gmail','outlook','import','manual','bitso','dispositivo','correo'));
alter table public.transactions drop constraint if exists transactions_fuente_check;
alter table public.transactions add constraint transactions_fuente_check check (fuente in ('belvo','import','gmail','outlook','manual','bitso','dispositivo','correo'));
alter table public.credentials drop constraint if exists credentials_proveedor_check;
alter table public.credentials add constraint credentials_proveedor_check check (proveedor in ('gmail','outlook','bitso','dispositivo','correo'));
