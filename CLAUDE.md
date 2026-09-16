# MoneyMaker — instrucciones para Claude Code

App de finanzas personales para México (web + móvil, PWA). Junta bancos, tarjetas, efectivo e inversiones; organiza el gasto por **quincena**; detecta suscripciones y **meses sin intereses**; arma presupuesto; mide patrimonio; da insights. Plan único $250 MXN/mes con 7 días de prueba.

Lee primero `PLAN.md` (qué construimos y en qué orden) y el handoff de diseño en `docs/handoff/` (`README.md`, `FLUJOS.md`, `design-tokens.json`, capturas en `screenshots/`, prototipo navegable en `design-reference/MoneyMaker Web.dc.html`).

## Reglas de producto y diseño
- Español mexicano, tuteo, tono formal. Sin emojis en la UI. Moneda MXN `$12,450` (es-MX, sin decimales).
- Paleta fija (`src/styles/tokens.css` / `docs/handoff/design-tokens.json`): verde `#16A34A`, verde claro `#4ADE80`, tinta `#0B1F17`, azul `#2563EB` para gasto/deuda/negativo, fondos blancos y grises `#F7F8F7`/`#F4F6F4`. **Nunca rojo.** Nunca inventes colores.
- Tipografía: Plus Jakarta Sans (títulos, cifras, 600–800) + Inter (cuerpo). `tabular-nums` global.
- Radios 12/14/18/24, píldoras 999. Sombras suaves de `tokens.css`.
- Dos layouts del mismo producto: web (sidebar 208 px + topbar 54 px, contenido máx 1264) y móvil (1 columna, tab bar flotante oscura con "+" central). Misma lógica y datos; cambia solo el layout. Una sola app: el cambio es responsive, no dos árboles de componentes.
- Modo oscuro con tokens `[data-theme="dark"]`; en oscuro los botones primarios van blancos con texto `#0B1F17`.
- Gráficas: SVG propio (no librerías). Cada tipo tiene su familia de color (Inicio pastillas apiladas verde/oscuro; Gastos barras azules; Presupuesto anillo de ticks verde; Inversiones línea verde). Animar siempre el cambio de selección; los números solo aparecen en el elemento seleccionado.
- Cada tab tiene estado vacío (icono, título, texto, CTA).

## Arquitectura
- Next.js 14 App Router + TypeScript + Tailwind (tokens en `tailwind.config.ts`) + lucide-react + Zustand.
- Supabase: Auth (correo + Google), Postgres con RLS por usuario, Storage para estados de cuenta. Migraciones en `supabase/migrations`.
- Datos: **todas las pantallas leen de nuestras tablas**, nunca de un proveedor directo. Las fuentes (Belvo, importación de estados de cuenta, Gmail, captura manual) escriben en las mismas tablas vía `src/lib/services/*`.
- `src/lib/domain/` = lógica pura con tests (quincena, presupuesto, detección de recurrentes/MSI, categorización por reglas). Sin I/O.
- `src/lib/services/` = integraciones detrás de interfaces (`aggregator`, `categorizer`, `importer`, `payments`, `mail`). Cada una tiene implementación `mock` para desarrollo.
- Nunca guardamos credenciales bancarias. "Pagar" no mueve dinero: enlaza a la app del banco.

## Comandos
- `npm run dev` · `npm run build` · `npm run lint` · `npm run typecheck` · `npm test`
- Variables en `.env.example`. Sin llaves reales en el repo.

## Convenciones
- Componentes en `src/components/<dominio>/`, pantallas en `src/app/`. Nombres en español para dominio (`quincena`, `recurrente`, `presupuesto`), inglés para infraestructura.
- Commits pequeños y descriptivos en español.
