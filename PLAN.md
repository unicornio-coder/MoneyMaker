# Plan MoneyMaker

Objetivo: app funcionando en una semana; bancos reales en 3; usuarios en 5; mercado en 7.

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
