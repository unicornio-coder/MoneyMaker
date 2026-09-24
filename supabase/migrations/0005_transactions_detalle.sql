-- Detalle por cargo: lo que el banco no dice y el recibo sí ("Secadora Remington · 1 de 6 MSI", "Roma Norte → Polanco").
-- `recibo` guarda solo el resumen extraído del correo (artículos, origen/destino, pedido); nunca el cuerpo del correo.
alter table public.transactions
  add column if not exists detalle text,
  add column if not exists recibo jsonb;
