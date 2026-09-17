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

## Modo real (Supabase + Belvo)

1. Crea un proyecto en [Supabase](https://supabase.com) y corre `supabase/migrations/0001_init.sql` en el SQL editor (o `supabase db push` con el CLI). Activa Google en Authentication → Providers si quieres login con Google.
2. Copia `.env.example` a `.env.local` y llena `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` y pon `NEXT_PUBLIC_USE_MOCK=false`.
3. Belvo: crea una cuenta en [developers.belvo.com](https://developers.belvo.com), toma las llaves de **sandbox** y ponlas en `BELVO_SECRET_ID` / `BELVO_SECRET_PASSWORD` con `BELVO_ENV=sandbox`. En el dashboard registra el webhook `https://<tu-dominio>/api/belvo/webhook` con el secreto de `BELVO_WEBHOOK_SECRET`. Para producción hay que firmar con Belvo y cambiar `BELVO_ENV=production`.
4. `ANTHROPIC_API_KEY` habilita la categorización de comercios desconocidos y la lectura de estados de cuenta en PDF. Sin llave, todo sigue funcionando con reglas y diccionario.

Sin llaves de Belvo, "Vincular banco" usa el agregador simulado. Con o sin Belvo, **Importar** acepta CSV, Excel y PDF de cualquier banco.

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

Cómo fluye un dato: cualquier fuente (Belvo, importación, Gmail, manual) produce `MovimientoCrudo[]` → `services/ingest.ts` categoriza (correcciones del usuario → reglas → diccionario MX → categoría del proveedor → LLM), deduplica por hash y guarda → `domain/recurrentes.ts` detecta suscripciones, servicios y MSI → `domain/insights.ts` genera avisos. Las pantallas solo leen del repositorio.
