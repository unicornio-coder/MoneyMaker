# Plan MoneyMaker

## Estado (17 sep 2026) · v0.1
Bloque A–D hechos: shell web/móvil, auth Supabase (correo + Google) con modo demo sin llaves, esquema con RLS,
motor de datos con tests (quincena, categorizador, recurrentes/MSI, presupuesto, insights), Belvo sandbox +
agregador simulado, importación CSV/XLSX/PDF, y todas las pantallas sobre datos reales: Inicio, Gastos, Fijos,
Presupuesto, Patrimonio, Inversiones, Objetivos, Insights, Ajustes, Planes, Onboarding. PWA instalable. Oscuro.
Fase 2–4 en código (17 sep): conector Gmail (OAuth + parsers), Bitso por API, Stripe (checkout con prueba,
webhook, portal), cron diario en Vercel, refresco al abrir, landing pública con registro, lista de espera,
aviso de privacidad y términos (borradores), eventos de producto (activación/wow/retención), credenciales cifradas.
Lo que falta depende de cuentas y firmas del fundador: ver `docs/CHECKLIST-FUNDADOR.md` y `docs/correo-belvo.md`.

Objetivo: app funcionando en una semana; bancos reales en 3; usuarios en 5; mercado en 7.

## Ruta a mercado (18 sep 2026) · todo lo que falta para que funcione y se pueda vender

### Ya funciona en producción (money-maker-tawny.vercel.app)
App completa (web + móvil PWA, oscuro), base de datos real con RLS, login con correo y Google, onboarding, importación de
estados de cuenta, categorización, suscripciones y MSI, presupuesto por quincena, patrimonio, insights, cron diario,
refresco al abrir, Belvo sandbox y Gmail en modo prueba configurados, landing, lista de espera, legales en borrador.

### Bloque 1 · Que funcione de verdad para un usuario (esta semana)
| # | Qué | Quién | Listo cuando |
|---|---|---|---|
| 1 | Belvo sandbox de punta a punta: widget → link → cuentas → movimientos → webhook con 200 | Cowork prueba, Claude corrige | conectas `bnk100/full` y ves movimientos |
| 2 | Revisión visual: 15 pantallas × escritorio/móvil/oscuro, con datos y con usuario vacío | Claude (desde aquí) + capturas de Cowork | cero textos cortados, cero rojo, cero pantallas en blanco |
| 3 | Estados de cuenta reales: Nu, BBVA, Banorte, Amex, Santander, HSBC (PDF/CSV/XLSX) | Fundador sube; Claude ajusta parsers | ≥ 95 % de filas leídas, ≥ 80 % bien categorizadas |
| 4 | Gmail con alertas reales (BBVA, Amex, Nu, Banorte) del fundador | Fundador conecta; Claude ajusta parsers | una compra real aparece en la app en < 5 min |
| 5 | `ANTHROPIC_API_KEY` (PDFs escaneados y comercios desconocidos) | Cowork | variable en Vercel |
| 6 | Stripe modo prueba: checkout, webhook, portal, trial → premium → vencido | Cowork configura; Claude verifica | pagas con 4242 y el plan cambia |
| 7 | Correos de Supabase en español (confirmación, recuperación, cambio de correo) | Claude escribe plantillas; Cowork las pega | recibes el correo en español |
| 8 | Borrado de cuenta y exportación de datos desde Ajustes | Claude verifica/termina | botón funciona en producción |
| 9 | Observabilidad: errores con contexto en logs, aviso si el cron falla | Claude | log claro por usuario/fuente |
| 10 | Tablero del fundador en `/admin`: registros, activación (< 10 min a la primera fuente), "wow visto", retención 2ª quincena, tickets de cancelación | Claude | tablero con datos reales |

### Bloque 2 · Beta cerrada (semanas 2–4, 20–50 usuarios, menos de 100 por Gmail)
- Reclutar personas de confianza; agregarlas como *test users* en Google Cloud; canal de soporte (WhatsApp) y encuesta corta.
- Cada usuario: conecta o sube una cuenta el día 1; revisamos sus categorías y suscripciones y corregimos con sus datos.
- Salida de beta cuando: activación > 70 %, retención a la 2ª quincena > 50 %, precisión ≥ 80 %, al menos 5 usuarios dispuestos a pagar.

### Bloque 3 · Requisitos para cobrar y lanzar (en paralelo; dependen de terceros)
- **Belvo producción**: correo a ventas hoy (`docs/correo-belvo.md`), contrato de 12 meses, certificación, llaves de producción, `BELVO_ENV=production`. Cotizar también Syncfy y Finerio. Plan B mientras: estados de cuenta + Gmail (ya listos).
- **Legal**: razón social, aviso de privacidad conforme a LFPDPPP con derechos ARCO, términos, revisión de abogado. No cobrar sin esto.
- **Cobro**: Stripe en vivo (datos fiscales, CLABE), llaves `sk_live`, webhook en vivo; facturación CFDI (Facturapi o similar) si se factura a usuarios.
- **Dominio y correo**: dominio propio en Vercel, correo `hola@`, SPF/DKIM para que los correos de Supabase no caigan en spam.
- **Google**: verificación OAuth y CASA solo si Gmail demuestra valor con más de 100 usuarios.
- **Seguridad y respaldo**: Supabase Pro (respaldos diarios y PITR), 2FA en Vercel/Supabase/Belvo/Stripe, prueba de RLS con dos usuarios.
- **Costos base**: Supabase Pro ~US$25/mes, Vercel Pro ~US$20/mes si hay tráfico, Anthropic ~US$5–20/mes, Belvo por link (cotización), dominio ~US$15/año.

### Bloque 4 · Lanzamiento (semanas 5–7)
- Landing final con el copy validado en beta ("llevas 3 meses pagándolo"), lista de espera → beta de pago → abierto.
- App en Play Store como TWA (PWA empaquetada); iOS por PWA instalable primero, Capacitor después.
- Contenido para TikTok/Instagram ("cuánto gastas en suscripciones"), programa de referidos, soporte con FAQ y proceso de "Cancelar por mí".
- Métricas de negocio: conversión prueba → pago, cancelación mensual, costo por usuario adquirido.

### Lo que solo el fundador puede hacer (lista corta)
Correo a Belvo hoy · abogado · Stripe en vivo · dominio · método de pago en Anthropic y Supabase Pro · subir sus estados de
cuenta · reclutar 20–50 personas y agregarlas como test users en Google · revisar y aprobar copy y precios.

## Cómo funciona todo (decidido)

| Pregunta | Decisión |
|---|---|
| De dónde salen los datos | **Belvo** (widget, links recurrentes, sync diaria + refresco al abrir). Complementos: **estados de cuenta** (PDF/CSV/Excel; cubre GBM+, Bitso, CETES y cualquier banco fuera de Belvo) y **Gmail** (alertas de compra BBVA/Amex, al instante; ≤100 usuarios sin CASA). Efectivo: manual. Todo cae en las mismas tablas. |
| Dónde vive | Next.js 14 + Supabase (Auth + Postgres + RLS + Storage) + Vercel. Una app, web y móvil (PWA). |
| "En vivo" | Refresco de Belvo al abrir + correos de alerta + "actualizado hace X min". Ningún agregador es tiempo real. |
| Cancelar suscripciones | Detección nuestra (recurrencia + diccionario de marcas MX). Cancelación **guiada** con enlace directo; **"Cancelar por mí"** = ticket atendido por el equipo. Nadie cancela por API. |
| Presupuesto | Motor de quincena propio: detecta nómina, fijos, MSI y promedios por categoría y **propone el presupuesto armado**; el usuario ajusta. |
| Cobro | Stripe MX, $250/mes o $2,500/año, 7 días de prueba con tarjeta. Al final. |
| Lo que no hacemos | Raspar bancos con contraseñas del usuario. Mover dinero. Prometer "no lo usas" (solo sabemos "lo pagas"). |

## Contexto que lo justifica
- México no tiene open banking operativo: las reglas de datos transaccionales de la Ley Fintech siguen sin publicarse (2026). Toda agregación es privada (Belvo, Finerio, Syncfy, Salt Edge).
- Belvo: sandbox gratis y autoservicio; producción requiere ventas, certificación y plan de 12 meses. **El correo a ventas se manda el día 1.**
- Belvo no cubre GBM+, CetesDirecto ni Kuspit; Nu, Amex y Coppel se confirman con el proveedor.
- `gmail.readonly` es scope restringido de Google: hasta 100 usuarios de prueba sin verificación; después, verificación OAuth + CASA (US$500–4,500, semanas, anual).
- Fintonic dejó de operar en México (jun 2026): agregar cuentas no basta; lo que vende es la acción (suscripciones, MSI, "puedes invertir $X").

## Fase 1 · Construir (7 días)

**Bloque A · Base (días 1–2).** Repo con handoff; Next.js + tokens + tema; shell web y móvil con todas las rutas; Supabase con auth (correo + Google) y esquema completo con RLS; deploy en Vercel. Motor de datos: quincena, categorizador (diccionario → proveedor → LLM), detector de recurrentes/MSI, importador de estados de cuenta. Usuario demo sembrado.
→ Funciona: entras, subes un estado de cuenta real y queda categorizado.

**Bloque B · Conexión + Inicio + Gastos (días 3–4).** Widget Belvo (sandbox) → links → cuentas y transacciones → base; webhooks; refresco al abrir; salud del link. Inicio completo. Gastos completo.
→ Funciona: conectas un banco y ves tu gasto de la quincena.

**Bloque C · Fijos + Presupuesto + Onboarding (días 5–6).** Fijos (tablas con lo detectado, drawer con cancelación guiada y ticket, calendario, nuevo recurrente). Presupuesto (anillo, tabla editable, propuesta automática). Onboarding 5 pasos real. Ajustes, Planes (visual), Insights por reglas, Patrimonio/Inversiones/Objetivos con captura manual. Gmail en modo prueba.
→ Funciona: un usuario nuevo sale del onboarding con suscripciones detectadas y presupuesto armado.

**Bloque D · Cierre (día 7).** Oscuro, QA en iPhone, PWA instalable, estados vacíos, bugs, `v0.1`.

Fuera de la semana: landing pública completa, cobro real, Familia, Kavak, "Cancelar por mí" automatizado, logos SVG oficiales, pixel-perfect de los 4 estados, Expo/tiendas.

## Fase 2 · Bancos reales (semanas 2–3)
Firmar Belvo, certificación, llaves de producción. Endurecer parsers de estados de cuenta (Nu, BBVA, Banorte, Amex, GBM+, Bitso). Bitso por API. Medir precisión de categorías y suscripciones con cuentas reales (meta ≥ 80 %).

## Fase 3 · Usuarios (semanas 3–5)
20–50 usuarios (menos de 100 por Gmail). Medir: primera cuenta conectada en < 10 min, "puedes ahorrar $X" visto, retención a la segunda quincena, tickets de cancelación. Aviso de privacidad + términos + borrado de cuenta. Corregir con sus datos.

## Fase 4 · Mercado (semanas 5–7)
Stripe con prueba de 7 días; landing conectada (copy corregido a "llevas 3 meses pagándolo"); Sentry, respaldos, soporte; logos oficiales; CASA solo si Gmail demostró valer la pena. Lista de espera → beta de pago → abierto.

## Pendientes del fundador (día 1)
Cuentas: Supabase, Vercel, Belvo (sandbox), Google Cloud (OAuth), Anthropic. Correo a ventas de Belvo (y cotización a Syncfy y Finerio como comparación): precio por link, mínimo, cobertura de Nu/Amex/Coppel, tiempo a producción.
