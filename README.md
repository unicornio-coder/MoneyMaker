# MoneyMaker

Finanzas personales para México, al estilo Rocket Money: bancos, tarjetas y estados de cuenta en un panel; suscripciones detectadas y cancelación con carta; presupuesto por quincena; resumen del domingo y avisos de cobros. Web y móvil (PWA), un solo código. Gratis con un banco; Plus $149 al mes.

- Qué construimos y en qué orden: [`docs/ROADMAP.md`](docs/ROADMAP.md) y [`docs/REDISENO.md`](docs/REDISENO.md).
- Cómo se opera en producción sin equipo: [`docs/OPERACION.md`](docs/OPERACION.md).
- Lo que solo el fundador puede hacer (llaves, cuentas): [`docs/PROMPTS-MAESTROS.md`](docs/PROMPTS-MAESTROS.md).
- Reglas para Claude Code: [`CLAUDE.md`](CLAUDE.md). Diseño: [`docs/handoff/`](docs/handoff/). Tablero de QA: [`qa/TABLERO.md`](qa/TABLERO.md).

## Correr en local (modo demo, sin llaves)

```bash
npm install
npm run dev
```

Abre <http://localhost:3000/app>. Sin variables de entorno la app corre en **modo demo**: un usuario con cuentas simuladas que pasan por el mismo pipeline que un usuario real. Los datos viven en memoria. Para empezar vacío: `MOCK_SIN_DEMO=true npm run dev` y sube los PDFs de `qa/entregables/estados/`.

Comandos: `npm run build` · `npm run typecheck` · `npm run lint` · `npm test` (unitarias) · `npm run test:e2e` (Playwright, móvil y escritorio; en CI corre contra `next build` + `next start`).

## Modo real

1. **Supabase**: proyecto nuevo, corre las migraciones de `supabase/migrations/` en orden (0001 a 0012), Authentication → URL Configuration con `https://<dominio>/auth/callback`. Copia `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY`; pon `NEXT_PUBLIC_USE_MOCK=false`.
2. **Vercel**: importa el repo, rama de producción `main`, agrega las variables de `.env.example` que tengas. Un PR a `main` con la etiqueta `publicar` y el CI en verde publica solo.
3. Cada integración se enciende con sus variables y `/api/health` dice cuáles están activas: Belvo (bancos), Resend (correos), Stripe (cobro), VAPID (push), Google/Microsoft (alertas del correo), Anthropic (lectura de PDF difíciles), token de GitHub (reportes → issues).

## Estructura

```
src/app            rutas (App Router): /app/*, /login, /registro, /onboarding, /api/*
src/components     UI por dominio (inicio, gastos, fijos, presupuesto, ayuda, planes, …)
src/lib/domain     lógica pura con tests: quincena, categorizar, recurrentes, presupuesto, plan, resumen, carta
src/lib/services   integraciones: aggregator (Belvo/mock), ingestion, correo, push, stripe, gmail, outlook
src/lib/server     rate limit, registro de errores, segundo plano
src/lib/data       repositorio (memoria y Supabase), contexto de sesión, siembra demo
supabase           migraciones
apps/android       app que reenvía notificaciones bancarias (Kotlin)
```

Cómo fluye un dato: cualquier fuente (Belvo, PDF, correo, notificación del teléfono, manual) produce movimientos crudos → `services/ingest.ts` categoriza, deduplica y guarda → `domain/recurrentes.ts` detecta suscripciones, servicios y MSI → `domain/insights.ts` genera avisos. Las pantallas solo leen del repositorio. El PDF y su contraseña nunca se guardan. Todas las tablas de usuario tienen RLS.
