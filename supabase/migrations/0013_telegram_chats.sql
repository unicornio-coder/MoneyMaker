-- Bot de Telegram "¿Cuánto me queda?": un chat privado de Telegram por usuario. El chat_id es el identificador
-- que manda Telegram en cada mensaje; no se guarda ningún mensaje ni el nombre de usuario de Telegram.
create table public.telegram_chats (
  chat_id text primary key,
  user_id uuid not null unique references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.telegram_chats enable row level security;
create policy "solo dueño" on public.telegram_chats for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
