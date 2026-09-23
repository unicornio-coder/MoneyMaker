# Arquitectura de MoneyMaker

Mapa del repositorio para quien llega nuevo. Se actualiza en cada fase de la reestructura (ver `qa/TABLERO.md` para el estado).

## Stack

- Next.js 14 (App Router) + TypeScript estricto + Tailwind. Estado de UI con Zustand (`src/lib/store/ui.ts`). Iconos lucide-react.
- Supabase: Auth (correo + Google), Postgres con RLS por usuario, Storage no se usa para PDFs (se procesan en memoria y se descartan).
- Claude (`@anthropic-ai/sdk`) lee estados de cuenta en PDF y categoriza descriptores desconocidos. Sin `ANTHROPIC_API_KEY` la app funciona con reglas.
- Un solo árbol de componentes para web y móvil: el layout es responsive (sidebar y topbar desde `md`, tab bar flotante por debajo).

## Carpetas

```
src/app/                Rutas (App Router)
  page.tsx              Landing pública
  (auth)/               login, registro (layout de dos columnas con PanelMarca)
  onboarding/           Alta guiada después del registro
  app/                  Pantallas autenticadas: inicio, gastos, fijos, presupuesto, patrimonio,
                        inversiones, insights, objetivos, importar, planes, ajustes
  api/                  imports (analizar/confirmar/descartar), belvo, gmail, stripe, cron, exportar, waitlist, qa/reset
  legal/                privacidad, términos
src/components/<dominio>/   Un directorio por pantalla + shell (AppShell, Sidebar, Topbar, TabBar) + ui (Button, Card, Chip, Money, Avatar…)
src/lib/domain/         Lógica pura con tests: quincena, presupuesto, recurrentes, categorizar, nomina, dedupe, money, fechas, insights
src/lib/services/       Integraciones detrás de interfaces: ingestion/ (PDF, tablas, email, Belvo), importacion, ingest, llm, gmail, bitso, stripe
src/lib/data/           Interfaz Repo + implementaciones memoria (mock) y supabase. Todas las pantallas leen de aquí.
src/lib/format.ts       formatMXN, formatFecha (fechas civiles), pluralize, saludo
src/lib/textos.ts       Copy centralizado (es-MX) + códigos de error
src/styles/tokens.css   Tokens semánticos y modo oscuro; paleta fija en tailwind.config.ts
supabase/migrations/    0001_init, 0002_fase2 (events, waitlist), 0003_imports (statement_imports)
scripts/                qa-pdfs (PDFs de prueba deterministas), qa-seed (usuarios qa01–qa10), screenshots (capturas 390/1440)
e2e/                    Playwright: importar.spec, capturas.spec
qa/                     TABLERO.md (estado), entregables (catálogos JSON, PDFs provisionales), precision.test.ts, talachas
docs/handoff/           Diseño: README, FLUJOS, design-tokens.json, capturas, prototipo navegable
```

## Flujo de datos

1. Las fuentes (PDF importado, tabla CSV/XLSX, Gmail, Belvo, captura manual) producen `MovimientoCrudo`.
2. `services/ingest.ts` categoriza (`domain/categorizar`), deduplica (`domain/dedupe`) y guarda en `transactions` vía `Repo`.
3. `recalcular` detecta recurrentes (suscripciones y MSI), nómina y días de pago; arma presupuesto sugerido e insights.
4. Las pantallas leen exclusivamente del `Repo` (nunca de un proveedor) y calculan por quincena con `domain/quincena`.

## Reglas duras

- El PDF nunca se guarda ni se registra: se procesa en memoria y se descarta. La contraseña vive solo en la llamada.
- Montos en centavos enteros en dominio y base de datos; la UI muestra pesos sin decimales con `formatMXN`.
- Fechas del dominio como `yyyy-mm-dd` (civiles, zona America/Mexico_City). Nunca `new Date('yyyy-mm-dd')`: usar `deISO` o `formatFecha`.
- Nada de datos financieros ni personales en logs.
- RLS en todas las tablas de usuario. "Pagar" no mueve dinero: enlaza a la app del banco.

## Modo mock

Sin llaves de Supabase la app corre con `repo.memoria.ts` y datos demo (`MOCK_SIN_DEMO=true` deja el usuario vacío). Los tests E2E y las capturas usan este modo.

## Despliegue

Vercel (`money-maker`). La rama de producción configurada es `claude/gallant-bohr-re8e7b`; `main` es la rama de integración. Cada cambio pasa por PR a `main` y luego a la rama de producción. Variables en `.env.example`.

## Comandos

`npm run dev` · `npm run build` · `npm run lint` · `npm run typecheck` · `npm test` · `npm run test:e2e` · `npm run capturas` · `npm run qa:precision`
