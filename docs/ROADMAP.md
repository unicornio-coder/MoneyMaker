# Roadmap: el Rocket Money mexicano

Meta: que MoneyMaker haga lo mismo que Rocket Money, en México, sin humanos en la operación. Los insights con IA
van **al final**; primero la app tiene que funcionar igual con datos reales.

## 0. Cómo conectar con Belvo (esto es lo primero y solo lo puedes hacer tú)

Belvo es el "Plaid" de México: el usuario mete sus credenciales del banco en el widget de Belvo (no en el nuestro),
Belvo entra al banco y nos devuelve cuentas y movimientos por API. Nuestro código ya lo usa (widget, cuentas,
movimientos, webhook, refresco). Lo que falta es tu cuenta de producción.

**Qué hacer, en orden (sin junta obligatoria; la piden ellos solo si tu caso lo amerita):**
1. Entra a https://dashboard.belvo.com con tu correo y crea la cuenta. El **sandbox es gratis** y ya está conectado.
2. En el dashboard: *Settings → Production access* (o "Request production"). Te pide: nombre legal de la empresa
   (persona física con actividad empresarial también sirve), RFC, país, sitio web (money-maker-tawny.vercel.app),
   caso de uso ("finanzas personales: agregación de cuentas y movimientos con consentimiento del usuario"),
   volumen estimado (di 100–500 usuarios el primer año) y cómo guardas datos (Supabase con RLS, sin credenciales).
3. Belvo revisa (1 a 5 días hábiles). Es posible que un ejecutivo te escriba para una llamada corta de 20 minutos:
   es normal, sirve para acordar precio. Si te preguntan, el plan que conviene es el de **pago por uso** ("pay as
   you go"): se cobra por *link* activo al mes (cada banco conectado por cada usuario), del orden de 0.3–0.6 USD por
   link al mes para bancos, con un mínimo mensual bajo en los planes de inicio. Sin contrato anual al arrancar. Pide
   por escrito el precio por link y el mínimo.
4. Te dan llaves de producción (Secret ID y Secret Password). Las pegas en Vercel como `BELVO_SECRET_ID`,
   `BELVO_SECRET_PASSWORD`, `BELVO_ENV=production` y `BELVO_WEBHOOK_SECRET`, y haces redeploy. Nada más.
5. Yo enciendo "Conectar mi banco" en la hoja "Agregar cuenta" el mismo día que estén las llaves (en sandbox lo
   enciendo desde ya con bancos de prueba para que veas el flujo completo).

**Bancos que cubre en México** (con credenciales del usuario): BBVA, Banorte, Santander, HSBC, Citibanamex,
Scotiabank, Banco Azteca, Inbursa, Afirme, BanBajío, Banregio; además Nu y algunas fintech en OFDA. Amex no.

**Si Belvo no aprueba o el precio no cuadra**: Finerio Connect (finerioconnect.com, mexicana, mismo modelo; pide
contacto de ventas) o Syncfy (Paybook, syncfy.com). Se cambian detrás de la misma interfaz `Aggregator` en dos días.
No vale la pena tener dos a la vez.

**Legal**: no necesitas licencia. No captas ni mueves dinero; Belvo es el que opera bajo la Ley Fintech (es agregador
registrado). Tú necesitas aviso de privacidad (ya está en `/legal/privacidad`) con la mención de Belvo como encargado
del tratamiento, consentimiento explícito al conectar (ya está en la hoja) y borrado a petición (ya está en Ajustes).

## 1. Qué hace Rocket Money y qué tenemos (mapa honesto)

| Rocket Money | MoneyMaker hoy | Falta |
|---|---|---|
| Conectar cuentas (Plaid) | Belvo integrado, apagado; PDF, correo, Android | Encenderlo, producción, refresco diario visible |
| Dashboard: saldo neto, gasto del mes, próximos cobros | Inicio con gasto por quincena, cuentas, patrimonio | Saldo neto arriba de todo, próximos cobros en Inicio |
| Transacciones con categoría y edición | Historial, categorías por reglas, corrección | Reglas "siempre categorizar X como Y", notas y etiquetas |
| Recurring: suscripciones y cobros con calendario | Fijos con calendario, suscripciones, MSI | Fecha de próximo cobro en todas, recordatorio 3 días antes |
| Cancelar suscripción (concierge) | Enlace directo, truco, carta PDF | Enviar la carta por correo al proveedor de forma automática, seguimiento hasta confirmar |
| Negociar facturas (internet, teléfono) | No | Fase 3: carta de negociación + guion; comisión sobre el ahorro |
| Presupuestos | Presupuesto por quincena propuesto solo | Alertas al 80 % y 100 % |
| Metas de ahorro (Smart Savings mueve dinero) | Objetivos | Aportación sugerida por quincena. Mover dinero **no** (necesita socio regulado) |
| Score de crédito | No | Fase 4 con Círculo de Crédito (contrato) |
| Reporte semanal / notificaciones | No | Correo del domingo, push de cobros próximos |
| Premium ($4–12 USD) | Plan único $250 | Gratis + Plus $149 con Stripe |
| Compartir con pareja | No | Fase 4 |

## 2. Roadmap (orden de construcción; cada bloque termina publicado y con E2E)

### Bloque 1: Cuentas conectadas de verdad (días 1–2) — **hecho en código (#45)**; producción cuando JC pegue las llaves de Belvo
- [x] "Conectar mi banco" (Belvo) encendido en la hoja "Agregar cuenta" con buscador de bancos; estado de cada conexión y "Actualizar ahora" en Ajustes; aviso en Inicio cuando un banco pide reconectar. En sandbox desde ya; producción cuando pegues llaves.
- [x] Refresco diario (cron 12:00 UTC) y al abrir la app; estado `mfa`/`roto` visible con aviso para reconectar.
- [x] Inicio al estilo Rocket: **saldo neto** arriba (cuentas − tarjetas), gasto del periodo, **próximos 7 días de cobros** con enlace al calendario.

### Bloque 2: Transacciones y recurrentes al 100 % (días 2–3) — **hecho en código (#45)**
- [x] Transacciones: categoría con regla "siempre así" (ya existía), **nota por movimiento** (migración 0008), búsqueda por monto en el historial y en ⌘K, exportar CSV (Ajustes).
- [x] Recurrentes: fecha del próximo cobro en todas, recordatorio 3 días antes, aviso "subió de precio" (regla, ≥ 5 %), "No es recurrente" (queda ignorado y el detector no lo revive).
- [x] Presupuesto: alertas al 80 % y al rebasar por categoría (Insights; por correo en el bloque 4 con Resend).

### Bloque 3: Cancelación y negociación sin humanos (días 3–4) — **hecho en código**; correos reales cuando JC pegue la llave de Resend
- [x] Cancelar: la carta en PDF se manda por correo al proveedor (campo "Correo de atención del servicio") con copia al
  usuario, o al usuario si no hay correo del servicio; queda registrado a quién se envió, se agenda seguimiento a
  10 días (evento en el calendario) y la vigilancia de que el cargo no regrese ya existía. Sin equipo humano.
- [x] Negociar: "Negociar mi tarifa" en servicios (internet, telefonía, seguros…): carta de negociación + guion de 4 pasos
  (competencia, retención, confirmación por escrito) por correo, registro del resultado (nuevo precio → ahorro anual y
  comisión del 25 % del primer año; el recurrente se actualiza), o "no bajaron el precio". Migración 0009 aplicada.
- Sin `RESEND_API_KEY` la carta se genera y se descarga igual; solo no sale el correo.

### Bloque 4: Cobro y retención (día 5)
- Gratis (1 banco o 1 PDF al mes, presupuesto, recurrentes) y Plus $149/mes o $1,290/año (bancos ilimitados, tiempo
  real, cancelación y negociación, reportes). Stripe Checkout, portal, webhook. Garantía visible.
- Resumen del domingo por correo y push de cobros próximos (PWA/Android).

### Bloque 5: Operación sin humanos (día 6)
- Centro de ayuda, reporte de problema que abre issue, correos automáticos de bienvenida y de "conecta tu banco".
- Salud con alerta, registro de errores, respaldo diario, rate limit, E2E del viaje completo.

### Bloque 6: Lanzamiento (día 7)
- Revisión pantalla por pantalla, textos, accesibilidad, legales, precios en la landing, README de operación.

### Después (semanas 2–4)
- Score de crédito (Círculo de Crédito), compartir con pareja, CFDI del SAT para detalle por compra.
- **Insights con IA** (proyección "te alcanza hasta el día X", gasto hormiga, comparación anónima): al final, cuando
  los datos reales ya entren solos. Sin datos reales, los insights son adorno.

## 3. Tu checklist (una vez)
1. Belvo: pasos de la sección 0.
2. GitHub: rama por defecto a `main`.
3. Google Cloud: cliente OAuth para Gmail (variables en Vercel).
4. Resend: cuenta, dominio y llave (correos de salida e inbound).
5. Stripe: precios Plus mensual y anual y llaves.
6. Android Studio: firmar y subir `apps/android` (opcional esta semana).

Todo está paso a paso en `docs/PROMPTS-MAESTROS.md` para Cowork.
