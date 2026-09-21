# Tablero · Bill Up

Única fuente de estado. Horas en America/Mexico_City (CDMX).

## Meta de hoy (21 sep 2026)
Desde "Agregar cuenta", el usuario sube uno o varios PDFs (mínimo 3 a la vez). Por cada uno la app reconoce institución, producto, tarjeta y periodo, y llena: carrusel de cuentas, drawer de tarjeta, historial, Gastos, Gastos fijos (suscripciones y MSI), Presupuesto sugerido, pasivos en Patrimonio y, si es débito, ingresos y días de quincena.

## Estado del código (auditoría 21 sep, 14:20)
1. Stack: Next.js 14 App Router + TypeScript estricto + Tailwind (tokens en `tailwind.config.ts`) + Zustand. Supabase para auth (correo + Google) y Postgres con RLS "solo dueño" en todas las tablas de usuario (`supabase/migrations/0001_init.sql`, `0002_fase2.sql`).
2. Modo demo: sin llaves de Supabase (`NEXT_PUBLIC_USE_MOCK=true` o sin URL/anon key) la app corre con el usuario "JC" y un repositorio en memoria (`src/lib/data/repo.memoria.ts`). Con llaves usa `repo.supabase.ts`. Misma interfaz `Repo`; las pantallas nunca tocan Supabase directo.
3. Dominio puro y probado (47 pruebas verdes): `quincena.ts` (días de pago configurables, default 5 y 20), `categorizar.ts` (reglas bancarias + diccionario MX de comercios), `recurrentes.ts` (suscripciones, servicios, MSI), `presupuesto.ts` (propuesta automática), `insights.ts`. Montos en pesos con dos decimales (numeric(14,2)); la importación nueva trabaja en centavos enteros y convierte en el borde.
4. Ingesta única: `services/ingest.ts` recibe `MovimientoCrudo[]` de cualquier fuente → categoriza (correcciones del usuario → reglas → diccionario → LLM) → deduplica por hash → guarda → recalcula recurrentes e insights. Fuentes hoy: Belvo (sandbox/real + mock), importación CSV/XLSX/PDF, Gmail, Bitso.
5. Importación de PDF actual: un solo archivo, texto con `pdf-parse` + LLM (o regex si no hay llave), sin contraseña, sin metadatos de tarjeta (saldo al corte, límite, fechas), sin cuadre, sin cola, sin registro de tokens. Es lo que se reemplaza hoy.
6. Pantallas: 15 rutas leyendo del repo. Carrusel, drawer, Gastos, Fijos, Presupuesto (se propone solo si no existe) y Patrimonio (crédito = pasivo con `saldo`) se llenan solos cuando la cuenta trae saldo/corte/límite. Estados vacíos existen en todas.
7. Auth: `src/middleware.ts` protege `/app/*` con Supabase SSR; `login`/`registro`/`auth/callback` existen; en demo no hay login (entra JC). Diagnóstico completo lo hace la sesión de auth (prompt 2).
8. LLM: `services/llm.ts` usaba SDK 0.52 (sin bloques de documento PDF ni salidas estructuradas). Hoy se sube a 0.127 y se agrega `pdfjs-dist` (PDF con contraseña).
9. No existe: `statement_imports`, `unmatched_descriptors`, `/api/imports`, `services/ingestion/`, Playwright, `/admin`, plantillas de correo en español, observabilidad, cuentas qa01–qa10.
10. Nombre: el código y la UI dicen "MoneyMaker" (38 lugares); PROMPTS-V2 dice "Bill Up". Ver Decisiones pendientes.

## Auth
Pendiente de la sesión dedicada (prompt 2). Hoy: middleware + Supabase SSR + páginas de login/registro. SIN CONFIRMAR si Google funciona en preview.

## Pasos de Claude Code (ingeniero principal)
| # | Paso | Estado | Hora |
|---|---|---|---|
| 0 | Auditoría y tablero | hecho | 14:25 |
| 1 | Migraciones + ingesta (`services/ingestion/`) + extracción PDF + pruebas de dominio | hecho | 14:45 |
| 2 | Subida múltiple desde "Agregar cuenta" (cola de 3, contraseña, revisión combinada) | en curso | |
| 3 | Pantallas con datos reales (carrusel, drawer, historial, Gastos, Patrimonio) | pendiente | |
| 4 | Suscripciones, MSI, nómina y días de quincena, presupuesto sugerido | pendiente | |
| 5 | E2E con Playwright + tabla "campo del PDF → valor detectado" | pendiente | |
| 6 | Resumen: funciona / falta / riesgos / decisiones | pendiente | |

## Talachas abiertas
| ID | Qué | Para | Desde | Vence | Estado |
|---|---|---|---|---|---|
| T-001 | Subir al repo los documentos que citan los prompts (REESTRUCTURACION-DE-PLAN, HOY-ESTADO-DE-CUENTA, PLAN-MVP, PLAN-QA-Y-AGENTES, BUSINESS-PLAN) | Coordinador / JC | 21 sep 14:25 | hoy | abierta |
| T-002 | `categorias.json`, `merchants.json`, `bancos.json`, `textos-flujo.json` definitivos (hay versiones mínimas provisionales) | Producto y contenido | 21 sep 14:25 | hoy | abierta |
| T-003 | 15 PDFs ficticios + JSON de respuesta correcta en `qa/entregables/estados/` (hay 3 PDFs mínimos generados por código para E2E) | Datos de prueba | 21 sep 14:25 | hoy | abierta |

## Entregables de Cowork
Ninguno recibido todavía. Provisionales creados por Claude Code en `qa/entregables/` (marcados `"provisional": true`); al llegar los definitivos se reemplazan sin tocar código.

## LISTO PARA PROBAR
- **Paso 1 · API de importación (sin pantalla todavía)** · Con la app corriendo (`npm run dev`, modo demo), desde una terminal:
  `curl -s -F "archivo=@qa/entregables/estados/provisional-01-credito-bbva-1.pdf" http://localhost:3000/api/imports | jq '.importacion | {estado, metodo, resumen, n: (.movimientos|length)}'` → `estado: "revisar"`, banco BBVA, últimos 4 `0001`, 11 movimientos. Luego `curl -s -X POST -H 'content-type: application/json' -d '{"items":[{"id":"<id>"}]}' http://localhost:3000/api/imports/confirmar` → cuenta creada, `propuestaQuincena` con días 14 y 30 si también subiste el de débito. La UI llega en el Paso 2.
- Pruebas automáticas: `npm test` (93) cubre: cambio de precio, cobro anual, mes saltado, duplicado exacto, reembolso, MSI 1/1, MSI que termina este mes, febrero, quincena en fin de semana, 3 PDFs a la vez, periodos traslapados, mismo archivo dos veces.

## Tickets
Sin tickets. Carpeta `qa/tickets/`. Formato: `qa/tickets/QA-###.md` con estado propuesto / aprobado / listo-para-verificar / cerrado.

## SOLO JC
1. `ANTHROPIC_API_KEY` en Vercel (y en `.env.local`): sin ella la lectura de PDF cae a reglas básicas y la precisión baja mucho. Opcional: `ANTHROPIC_MODEL` (default `claude-opus-5`).
2. Confirmar plan de Vercel: `maxDuration` de `/api/imports` se puso en 300 s (Fluid compute). Si el deploy lo rechaza, bajar a 60 y avisar: un PDF grande puede no alcanzar.
3. Correr `supabase/migrations/0003_imports.sql` en el SQL Editor del proyecto (statement_imports, unmatched_descriptors).

## Riesgos
- Sin `ANTHROPIC_API_KEY` no hay reconocimiento de banco/tarjeta confiable en PDF (cae a reglas: solo PDFs con texto limpio tipo "fecha  descripción  monto").
- El camino con modelo (Claude, PDF como documento + salida estructurada) está escrito pero **SIN CONFIRMAR** en vivo: en este entorno no hay llave. Primera prueba real: SOLO JC #1.
- PDF con contraseña: el código lo maneja (pdf.js en memoria) pero no hay forma de generar un PDF cifrado aquí (sin qpdf/pypdf); queda SIN CONFIRMAR hasta que llegue el caso `_pass-1234.pdf` de T-003.
- Un PDF de 20+ páginas puede exceder el tiempo de la función en Vercel; mitigación en Paso 1 (streaming, `maxDuration`), plan B: cola por etapas.
- Los documentos de referencia no están en el repo (T-001): el esquema JSON de extracción lo define Claude Code y puede no coincidir con HOY-ESTADO-DE-CUENTA.md paso 1.

## Decisiones pendientes de JC
1. Nombre en la UI: "MoneyMaker" (código, CLAUDE.md) vs "Bill Up" (PROMPTS-V2). Propuesta: cambiar todos los textos visibles a Bill Up en un commit aparte; el repo puede seguir llamándose MoneyMaker.
2. Quincena: PROMPTS-V2 §1 dice "1–15 / 16–fin"; §2 dice "días de pago 5 y 20" (lo que ya hace el motor). Propuesta: mantener días de pago configurables (default 5 y 20) y proponerlos desde la nómina detectada.
3. Nombres de archivos del dominio: PROMPTS-V2 pide `money.ts`, `periods.ts`, `categorize.ts`…; CLAUDE.md pide nombres en español y ya existen `quincena.ts`, `categorizar.ts`, `recurrentes.ts`, `presupuesto.ts` con pruebas. Propuesta: conservar los existentes (español), agregar `money.ts` y `dedupe.ts` nuevos, y no reescribir lo probado.
4. "Conectar mi banco automáticamente" queda deshabilitado (Próximamente) según PROMPTS-V2, aunque Belvo sandbox ya funciona en código. Se puede volver a activar con un cambio de una línea.

## Bitácora
- 21 sep 14:05 · Claude Code · Sesión iniciada. Los documentos citados no están en el repo; se trabaja con PROMPTS-V2.md como especificación.
- 21 sep 14:12 · Claude Code · Baseline: typecheck limpio, 47 pruebas verdes. SDK de Anthropic 0.52 → 0.127; `pdfjs-dist` agregado.
- 21 sep 14:25 · Claude Code · Paso 0 terminado: `qa/` creado, tablero, talachas T-001 a T-003, entregables provisionales.
- 21 sep 14:45 · Claude Code · Paso 1 terminado: `services/ingestion/` (TransactionSource + statement-pdf, statement-table, email y belvo "próximamente"), migración `0003_imports.sql` (statement_imports, unmatched_descriptors), `/api/imports` (POST analizar, GET pendientes), `/api/imports/[id]` (GET, DELETE), `/api/imports/confirmar`; dominio: money (centavos), nómina y días de quincena, dedupe con repetidos y cuadre ±1 %/±$50, recurrentes con cambio de precio, mes saltado, horizonte de datos y confirmación de "posible suscripción" al verla 2 meses; catálogos de `qa/entregables` leídos por el categorizador. 93 pruebas, lint y build en verde. Decisión: se mantienen los módulos de dominio en español ya probados (ver Decisiones pendientes #3).
