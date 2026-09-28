# Operación de MoneyMaker (README de lanzamiento)

Cómo corre la app en producción, qué se vigila solo, dónde mirar cuando algo falla y qué hacer. Pensado para que una
sola persona (JC) opere sin equipo.

## 1. Piezas

| Pieza | Dónde | Para qué | Falla típica |
|---|---|---|---|
| Vercel (`money-maker`) | vercel.com → proyecto | Web, API, crons | Deploy roto: ver Deployments → logs; `git revert` y PR con `publicar` |
| Supabase (`Money Maker`) | supabase.com | Auth, base, RLS | Proyecto pausado (plan gratis, 7 días sin uso): botón Restore |
| Belvo | dashboard.belvo.com | Bancos (sandbox hasta tener producción) | Link `mfa`/`roto`: el usuario reconecta desde Inicio |
| Resend | resend.com | Correos de salida | Dominio no verificado: los correos no salen (`/api/health` → `correo`) |
| Stripe | dashboard.stripe.com | Cobro de Plus | Webhook sin firma: Developers → Webhooks → reintentar |
| GitHub Actions | pestaña Actions | CI, publicación, bots | Ver sección 3 |

## 2. Publicar

1. Cualquier cambio entra por PR a `main` con la etiqueta **publicar**.
2. El CI corre lint, tipos, 170+ pruebas unitarias, build y 18 E2E (móvil y escritorio). Si está en verde, el bot
   fusiona y Vercel despliega `main` en 2 o 3 minutos.
3. Comprobar: el pie de la landing dice `Versión x · build abc1234` (el hash del commit) y
   `https://money-maker-tawny.vercel.app/api/health` responde `ok:true`.
4. Revertir: `git revert <sha>` en una rama, PR con `publicar`.

## 3. Bots (sin humanos)

| Workflow | Cuándo | Qué hace | Si falla |
|---|---|---|---|
| `ci.yml` | cada PR | calidad, E2E y fusión con `publicar` | Un fallo de `next/font` (Google Fonts) se reintenta una vez |
| `salud.yml` | cada hora | `/api/health`, landing, login; abre issue "Producción caída" y lo cierra al volver | Leer el issue: dice qué falló (`db`, `modelo`, ruta) |
| `respaldo.yml` | diario 8:23 UTC | `pg_dump` como artefacto 30 días | Necesita el secreto `SUPABASE_DB_URL` |
| `enlaces.yml` | martes | prueba los enlaces de cancelación del catálogo | Abre issue `catalogo` |
| `logos.yml` | lunes | actualiza logos de marcas | Ninguna acción |

Crons de Vercel (`vercel.json`, todos protegidos con `CRON_SECRET`):
`/api/cron/sync` 12:00 UTC (bancos y correos), `/api/cron/diario` 13:00 UTC (avisos push y correo "conecta tu banco"),
`/api/cron/resumen` domingos 14:00 UTC (resumen semanal). En el plan Hobby de Vercel solo corren 2 crons diarios: si
sigues en Hobby, quita `resumen` o pásate a Pro.

## 4. Dónde mirar

- **Salud**: `GET /api/health` → `db`, `modelo`, `belvo`, `gmail`, `outlook`, `stripe`, `correo`, `push`.
- **Errores**: tabla `app_errors` en Supabase (Table Editor), ordenada por fecha. Sin datos personales. Consulta útil:
  `select contexto, count(*) from app_errors where created_at > now() - interval '1 day' group by 1 order by 2 desc`.
- **Reportes de usuarios**: issues con etiqueta `reporte` (o correo a `SOPORTE_CORREO` si no hay token).
- **Métricas**: tabla `events` (`registro`, `onboarding_completo`, `fuente_conectada`, `import_lista`,
  `suscripcion_cancelada`, `checkout_iniciado`, `suscripcion_pagada`, `reporte_problema`…).
- **Logs**: Vercel → proyecto → Logs (filtra por `[error]`).

## 5. Qué hacer cuando

- **Un usuario no recibe el enlace de acceso**: revisar Resend → Emails (¿rebotó?) y Supabase → Auth → Rate limits.
  Sin Resend, Supabase manda máximo 3 correos por hora por proyecto.
- **"La base no responde" (issue de salud)**: Supabase pausó el proyecto (plan gratis). Restore y considerar Pro.
- **Belvo devuelve `mfa` o `roto`**: normal; el usuario ve el aviso en Inicio y reconecta. Si pasa con todos, revisar
  las llaves (`/api/health` → `belvo`) y el estado de Belvo (status.belvo.com).
- **Cobro fallido**: Stripe reintenta solo; el webhook baja el plan a Gratis al cancelarse. Nada que hacer a mano.
- **Reporte con datos sensibles**: borrar el issue; el texto lo escribió el usuario.
- **Subida de PDF lenta**: cada archivo tarda menos de un minuto; más de 20 en 10 minutos por usuario responde 429.

## 6. Capacidad y costos

Con los planes gratis: unos cientos de usuarios activos sin problema. Con Vercel Pro y Supabase Pro (unos 45 USD al
mes): 10,000 usuarios activos sin cambiar código. Lo que sube con los usuarios: Belvo (por banco conectado al mes) y
Resend (por correo).

## 7. Lo que solo JC puede hacer (una vez)

`docs/PROMPTS-MAESTROS.md` tiene los pasos exactos: Belvo producción, Resend, Stripe, Google OAuth, VAPID, token de
issues, respaldo, dominio propio y rama por defecto a `main`.
