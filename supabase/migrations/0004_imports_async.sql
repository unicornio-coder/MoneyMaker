-- Importación asíncrona: la API responde de inmediato y el procesamiento sigue en segundo plano.
-- `etapa` y `progreso` permiten a la UI mostrar en qué va cada archivo mientras consulta el estado.
alter table public.statement_imports
  add column if not exists etapa text check (etapa in ('subido','leyendo','extrayendo','cuadrando','listo')),
  add column if not exists progreso integer not null default 0 check (progreso between 0 and 100),
  add column if not exists duracion_ms integer;
