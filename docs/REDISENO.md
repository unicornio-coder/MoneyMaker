# Rediseño de flujos (28 sep 2026)

Pedido de JC: la estructura de ideas está bien, pero las pantallas no se entienden solas, sobran palabras y botones, y el
diseño no está a la altura de una fintech. Este documento reestructura cada flujo, contesta las preguntas con la verdad y
ordena la ejecución en tres fases. Referencias visuales: las capturas que mandó JC (monsy, wallet con tiles por categoría,
app de recordatorios de suscripciones, pantalla "Get notified", toasts).

## 0. Respuestas honestas

**¿La gente sí puede conectar su banco real?** Sí, pero solo con las llaves de producción de Belvo. Hoy corre en sandbox:
por eso el widget muestra IMSS, SAT y bancos de prueba. Con producción, Belvo pide usuario y contraseña del banco (nunca
CURP ni RFC para bancos). Lo que hacemos en código: el widget solo muestra bancos (`institution_types: retail y business`),
nada fiscal ni de empleo. Lo que solo puedes hacer tú: pedir producción en dashboard.belvo.com (sección 0 del ROADMAP).
Nada más lo destraba. Sin eso, la única entrada real de datos es el PDF, el correo y el teléfono Android.

**Google "se traba".** El botón de Google necesita un cliente OAuth configurado en Supabase (Authentication → Providers
→ Google) con tu Google Cloud. No está. Decisión: entrar con el correo. Escribes tu correo, te llega un enlace de
MoneyMaker, lo abres y ya estás dentro; en el primer paso puedes crear una contraseña para las próximas veces. Google
queda oculto hasta que exista el cliente (`NEXT_PUBLIC_LOGIN_GOOGLE=true`).

**¿Ya se puede pagar?** El flujo (Checkout, portal, webhook, planes Gratis/Plus) está listo. Cobra de verdad cuando pegues
las 4 llaves de Stripe (paso 5d del prompt de Cowork). Sin ellas todos tienen Plus completo de prueba.

**Correo y notificaciones: ¿podemos leerlos?** Sí, con límites reales:
- Gmail: OAuth de Google con el permiso `gmail.readonly`. Google lo considera "restringido": para más de 100 usuarios
  exige verificación de la app y una auditoría de seguridad (CASA, la paga el desarrollador, unos 500–1,500 USD al año).
  Hasta entonces funciona en modo "prueba" con hasta 100 correos que tú agregues a mano en Google Cloud.
- Outlook/Hotmail: Microsoft Graph `Mail.Read`, sin auditoría. Ya está en código.
- Reenvío: una dirección propia por usuario a la que reenvía alertas; no requiere permisos. Ya está en código.
- Notificaciones del teléfono: en Android sí (app `apps/android`, ya escrita, falta compilarla). En iPhone no es posible:
  Apple no deja leer notificaciones de otras apps.

## 1. Navegación nueva

Pestañas: **Inicio · Gastos · [+] · Presupuesto · Suscripciones**. Sale Patrimonio (la ruta sigue, oculta). Objetivos y
avisos viven en la campana. Inversiones queda en "Más". Títulos de pantalla a 22 px. Un solo color de botón primario
(tinta; verde solo para la acción principal de dinero) y un solo estilo de chip (tinta activo).

## 2. Flujos, pantalla por pantalla

### Entrar (una pantalla)
1. Correo → "Te mandamos un enlace". 2. Abre el enlace → entra. 3. Onboarding paso 1: nombre y contraseña (opcional).
Sin "cuándo te pagan": los días de pago se infieren de la nómina y se ajustan en Ajustes.

### Onboarding (3 pasos)
1. **Tu cuenta**: nombre, contraseña opcional. 2. **Metas** (las tarjetas verdes actuales). 3. **Conecta**: dos botones
grandes, "Conectar mi banco" (Belvo) o "Subir estado de cuenta". No hay "saltar": sin una fuente no hay panel.

### Inicio (referencia: monsy)
- Tarjeta oscura arriba: **Saldo neto** grande; debajo dos tiles: Cuentas (lo que tienes) y Tarjetas (lo que debes).
- **Cuentas vinculadas**: lista con logo, nombre, saldo y estado; botón "Conectar banco" siempre visible.
- **Suscripciones**: próximas 7 días con badge "mañana" / "en 3 días", monto y logo; enlace a Suscripciones.
- **Movimientos recientes**: 5, con "Ver todos" a Gastos.
Sale de Inicio: gasto por quincena, sube Excel, objetivos.

### Gastos (referencia: wallet con tiles)
- Selector de periodo (Semana / Mes / Personalizado) y total del periodo grande.
- **Categorías** como tiles con icono y monto (4 principales, "Ver todas"); tocar una filtra la tabla.
- **Tabla de movimientos** del periodo (fecha, comercio, categoría, cuenta, monto) con búsqueda. Filtro por categoría y
  por cuenta como chips, nada más. Efectivo se anota desde el "+".
Sale: círculos por cuenta, dona, "top gastos" con texto.

### Suscripciones (antes Fijos; referencia: app de recordatorios)
- Arriba: total al mes y cuántas activas. Lista con logo, nombre, "cada mes", monto y badge de próximo cobro.
- Detalle: próximo cobro, ciclo, total pagado, categoría, "avisarme 3 días antes" (switch) y **Cancelar**.
- **Cancelar en 3 botones**: "Cancelar en {servicio}" (enlace directo o teléfono), "Mandar carta por correo" (solo pide
  el correo del servicio; la carta sale con copia a ti), "Ya la cancelé". Sin formulario de nombre, correo, tarjeta.

### Presupuesto
- Un solo bloque arriba: gastado / límite, barra, "te quedan $X". Chips: Quincena / Mes; filtro por cuenta.
- Tabla por categoría con **icono**, límite editable, gasto real y barra. Botón "Subir mi Excel" (columnas categoría y
  monto) que arma el presupuesto desde su hoja y deja solo las categorías que usa.

### Inversiones
- Con datos: como está. Vacío: pantalla limpia con tres logos (GBM+, Bitso, CetesDirecto), una frase y un botón. Sin
  la palabra "IA" en ninguna parte.

### Campana → Avisos
- Solo dos tipos: **cobros** (mañana / en 3 días / subió de precio / cargo tras cancelar) y **suscripciones** (nueva).
- Debajo, **Metas**: crear una meta (ahorro, deuda, inversión) y ver el avance. Pantalla "Activa los avisos" al estilo
  "Get notified" cuando aún no están activos en el dispositivo.

### Landing
- Sale "Sabe cuánto te queda esta quincena" y las cifras inventadas. Queda: promesa + producto, marcas, conecta,
  suscripciones, seguridad, precio. Más imagen, menos texto; tipografía grande; una sola CTA por sección.

## 3. Fases de ejecución

- **Fase 1 (este PR)**: Belvo solo bancos; entrar con correo (enlace) y Google oculto; onboarding de 3 pasos con conexión
  obligatoria; navegación nueva (Suscripciones, sin Patrimonio, Objetivos en la campana); títulos a 22 px; chips y
  botones unificados; cancelación en 3 botones; landing sin "cuánto te queda"; Inversiones vacío limpio; campana = Avisos + Metas.
- **Fase 2**: Inicio y Gastos rediseñados (tiles, tabla, cuentas vinculadas, suscripciones próximas).
- **Fase 3**: Presupuesto con iconos, filtro por cuenta y Excel; Suscripciones con detalle tipo recordatorio; landing con
  más imagen; pantalla "Activa los avisos".
- Después: insights con IA (al final, como pediste).
