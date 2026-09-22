# MoneyMaker

Finanzas personales para México: bancos, tarjetas, efectivo e inversiones en un panel; gasto por **quincena**; suscripciones y **meses sin intereses** detectados; presupuesto que se arma solo; patrimonio e insights. Web + móvil (PWA), un solo código.

Plan y decisiones: [`PLAN.md`](PLAN.md). Reglas para Claude Code: [`CLAUDE.md`](CLAUDE.md). Diseño: [`docs/handoff/`](docs/handoff/).

## Correr en local (modo demo, sin llaves)

```bash
npm install
npm run dev
```

Abre <http://localhost:3000/app>. Sin variables de entorno la app corre en **modo demo**: usuario "JC" con seis cuentas simuladas (Nu, Amex, Coppel, BBVA, Bitso, GBM+) que pasan por el mismo pipeline que un usuario real (conectar → ingesta → categorizar → recurrentes → insights). Los datos viven en memoria y se reinician al reiniciar el servidor.

Otros comandos: `npm run build` · `npm run typecheck` · `npm run lint` · `npm test`.

Para probar el flujo "primer estado de cuenta" con el usuario demo vacío: `MOCK_SIN_DEMO=true npm run dev` y sube los PDFs de `qa/entregables/estados/` (se regeneran con `npm run qa:pdfs`).

QA: `npm run test:e2e` (Playwright, móvil y escritorio) · `npm run qa:precision` (tabla "campo del PDF → valor detectado" en `qa/reportes/`) · `npm run qa:seed` / `npm run qa:reset` (cuentas qa01–qa10 en preview, requiere `SUPABASE_SERVICE_ROLE_KEY`). El tablero de estado vive en `qa/TABLERO.md`.

## Modo real (Supabase + Belvo)

1. Crea un proyecto en [Supabase](https://supabase.com) y corre `supabase/migrations/0001_init.sql` en el SQL editor (o `supabase db push` con el CLI). Activa Google en Authentication → Providers si quieres login con Google.
2. Copia `.env.example` a `.env.local` y llena `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` y pon `NEXT_PUBLIC_USE_MOCK=false`.
3. Belvo: crea una cuenta en [developers.belvo.com](https://developers.belvo.com), toma las llaves de **sandbox** y ponlas en `BELVO_SECRET_ID` / `BELVO_SECRET_PASSWORD` con `BELVO_ENV=sandbox`. En el dashboard registra el webhook `https://<tu-dominio>/api/belvo/webhook` con el secreto de `BELVO_WEBHOOK_SECRET`. Para producción hay que firmar con Belvo y cambiar `BELVO_ENV=production`.
4. `ANTHROPIC_API_KEY` habilita la categorización de comercios desconocidos y la lectura de estados de cuenta en PDF (el PDF va al modelo como documento; si venía con contraseña, va el texto ya descifrado en memoria). Sin llave, todo sigue funcionando con reglas y diccionario, pero solo con PDFs de texto limpio. Corre también `supabase/migrations/0003_imports.sql`.

Sin llaves de Belvo, "Vincular banco" usa el agregador simulado. Con o sin Belvo, **Importar** acepta CSV, Excel y PDF de cualquier banco.

## Conectores y cobro (Fase 2–4)

- **Gmail** (`GOOGLE_CLIENT_ID/SECRET`, scope `gmail.readonly` en modo prueba ≤100 usuarios): Ajustes → Cuentas conectadas → Conectar Gmail. Lee solo alertas de compra de bancos conocidos; parsers en `src/lib/services/gmail.parsers.ts`.
- **Bitso** (llaves de solo lectura del usuario, cifradas con `CREDENTIALS_KEY`): Ajustes → Cuentas conectadas → Bitso.
- **Stripe** (`STRIPE_*`): Planes → Empezar 7 días gratis abre Checkout; `/api/stripe/webhook` mantiene `profiles.plan`.
- **Cron** (`vercel.json` + `CRON_SECRET`): `/api/cron/sync` sincroniza Belvo, Gmail y Bitso a diario; además la app refresca al abrir.
- **Legal**: `/legal/privacidad` y `/legal/terminos` (borradores para revisión).
- Pasos exactos para cada cuenta: `docs/CHECKLIST-FUNDADOR.md`.

## Deploy en Vercel

Importa el repo en Vercel, agrega las mismas variables de entorno y despliega. `NEXT_PUBLIC_APP_URL` debe ser la URL pública (la usa el widget de Belvo y los callbacks de auth). En Supabase agrega `https://<dominio>/auth/callback` a las Redirect URLs.

## Estructura

```
src/app            rutas (App Router): /app/*, /login, /registro, /onboarding, /api/*
src/components     UI por dominio (inicio, gastos, fijos, presupuesto, patrimonio, …)
src/lib/domain     lógica pura con tests: quincena, categorizar, recurrentes, presupuesto, insights
src/lib/services   integraciones: aggregator (Belvo/mock), importer, llm, ingest, conectar
src/lib/data       repositorio (memoria y Supabase), contexto de sesión, siembra demo
supabase           migraciones y config
docs/handoff       diseño, tokens, flujos y capturas de referencia
```

Cómo fluye un dato: cualquier fuente (Belvo, importación, Gmail, manual) produce `MovimientoCrudo[]` → `services/ingest.ts` categoriza (correcciones del usuario → reglas → diccionario MX → catálogo de `qa/entregables` → categoría del proveedor → LLM), deduplica por hash y guarda → `domain/nomina.ts` reconoce el sueldo y propone días de quincena → `domain/recurrentes.ts` detecta suscripciones, servicios y MSI → `domain/insights.ts` genera avisos. Las pantallas solo leen del repositorio.

Estados de cuenta por archivo: `services/ingestion/` define `TransactionSource` (hoy `statement-pdf` y `statement-table`; `email` y `belvo` próximamente) y `services/importacion.ts` lleva el ciclo analizar → revisar → confirmar sobre la tabla `statement_imports` (`/api/imports`). El archivo nunca se guarda; la contraseña del PDF tampoco.
