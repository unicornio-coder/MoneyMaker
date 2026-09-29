# Rediseño de flujos (28 sep 2026)

Pedido de JC: la estructura de ideas está bien, pero las pantallas no se entienden solas, sobran palabras y botones, y el
diseño no está a la altura de una fintech. Este documento reestructura cada flujo, contesta las preguntas con la verdad y
ordena la ejecución en tres fases. Referencias visuales: las capturas que mandó JC (monsy, wallet con tiles por categoría,
app de recordatorios de suscripciones, pantalla "Get notified", toasts).

## 0. Respuestas honestas

**¿La gente sí puede conectar su banco real?** Todavía no, y ya sabemos exactamente por qué (29 sep): la cuenta de Belvo
solo tiene habilitados SAT (fiscal) e IMSS (empleo); no tiene el producto de banca. Por eso el widget muestra "Empleo" y
"Fiscal" y ningún banco, con o sin filtros. Lo que hace el código: detecta la situación (Ajustes → Cuentas conectadas →
"Conexión con Belvo"), avisa en el modal de conectar y manda al PDF, y cuando Belvo habilite bancos el widget abrirá
solo con bancos (`institution_types: retail y business`), nada fiscal ni de empleo. Lo que solo puedes hacer tú: pedirle
a Belvo que habilite banca en sandbox y producción (texto listo en `docs/PROMPTS-MAESTROS.md`, paso 5h). Con producción,
Belvo pide usuario y contraseña de la banca en línea y el token del banco, en su ventana (nunca CURP ni RFC para bancos).
Sin eso, la entrada real de datos es el PDF, el correo y el teléfono Android.

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
- **Fase 2 (hecha)**: Inicio (saldo neto en tarjeta oscura, tiles Cuentas/Tarjetas, cuentas como lista, suscripciones
  próximas con badge, movimientos recientes) y Gastos (total del periodo con filtro por cuenta, tiles por categoría con
  icono que filtran la tabla, tabla de movimientos, efectivo plegado). Fuera: gráfica por quincena, círculos por cuenta,
  dona, "sube tu Excel" de Inicio.
- **Fase 3 (hecha)**: Presupuesto con un solo bloque arriba (gastado de límite, te quedan, filtro por cuenta), lista por
  categoría con icono y límite editable, "Subir mi Excel" (la hoja se lee en el navegador y se mapea a categorías);
  detalle de suscripción tipo app de recordatorios (próximo cobro, ciclo, total pagado, categoría, "avisarme 3 días
  antes", cancelar en 3 botones); landing con pantallas reales (hero y sección "Así se ve") y menos texto; tarjeta
  "Activa los avisos" en la campana.
- Después: insights con IA (al final, como pediste).
