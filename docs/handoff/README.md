# Handoff: MoneyMaker — finanzas personales para México (web + móvil)

## Overview
MoneyMaker junta cuentas de débito, tarjetas de crédito, efectivo e inversiones (GBM+, Bitso, CETES) en un panel; organiza el gasto por **quincena**; detecta suscripciones y gastos fijos; arma un presupuesto por categoría; mide patrimonio (activos, pasivos, P&L) y da insights. Vinculación bancaria vía **Belvo** (solo lectura). Modelo: plan Premium con prueba gratis.

Un mismo producto tiene dos vistas que el prototipo alterna con un switch **Web / Mobile app** en la barra de prototipo (arriba). Web = sidebar izquierda + contenido en marco de laptop 1380 px. Mobile = iPhone 15 (393 × 852) con tab bar flotante oscura y botón "+" central. Ambas comparten los mismos datos, estado y pantallas; cambia el layout (1 columna en móvil, 2 columnas `1.7fr / 1fr` en web para Inicio).

Además hay **modo Claro / Oscuro** (switch en la barra de prototipo). En el prototipo el oscuro es una inversión de la pantalla con logos preservados; en producción implementar con tokens (ver Design Tokens → Dark).

## About the Design Files
`design-reference/MoneyMaker Web.dc.html` (+ `support.js`) es una **referencia de diseño hecha en HTML**: un prototipo navegable con datos mock. No es código de producción. La tarea es **recrear estas pantallas en el stack del proyecto** (sugerido: Next.js 14 App Router + TypeScript + Tailwind; móvil como PWA responsive o Expo/React Native compartiendo tokens) siguiendo sus patrones. Abre el HTML en el navegador para ver medidas, colores, estados e interacciones exactas; las capturas en `screenshots/` son la guía rápida.

## Fidelity
**Hi-fi.** Colores, tipografía, radios, espaciados, copy e interacciones son finales. Recrear con precisión; no inventar colores ni componentes nuevos.

## Estructura general

### Fases (estado `fase`)
1. `registro` — Landing pública (hero, marcas, funciones, testimonios, cierre).
2. `correo` → `password` — Registro por correo y contraseña. La pantalla de inicio de sesión incluye el switch Web / Mobile (solo prototipo).
3. `onb` — Onboarding en 5 pasos (`paso` 0–4): metas, vincular cuentas, quincena, plan, resumen.
4. `app` — App interna, navegada por `tab`.

### Tabs de la app (`tab`)
| tab | Título | Nav web | Tab bar móvil |
|---|---|---|---|
| `panel` | Inicio | ✔ | ✔ Inicio |
| `gastos` | Gastos | ✔ | ✔ Gastos |
| `recurrentes` | Gastos fijos | ✔ | ✔ Fijos |
| `presupuesto` | Presupuesto | ✔ | ✔ Plan |
| `patrimonio` | Patrimonio | ✔ | hoja "Más" |
| `inversiones` | Inversiones | ✔ | hoja "Más" |
| `objetivos` | Objetivos | ✔ | hoja "Más" |
| `insights` | Insights (campana) | icono topbar | hoja "Más" |
| `importar` | Importar Excel | tarjeta en Inicio | hoja "Más" |
| `ajustes` | Ajustes (avatar "JC") | avatar topbar | hoja "Más" |
| `premium` | Planes | desde Ajustes / Insights | idem |
| `pnl`, `score`, `online`, `cuentas`, `transacciones` | pantallas secundarias enlazadas desde tarjetas | — | — |

### Layout web
- Sidebar blanca 208 px (colapsable a 66 px, `sbExp`), borde derecho `#EEF2EF`, logo "M" verde 28 px + "MoneyMaker" (Plus Jakarta Sans 14.5/700). Items: icono 18 px + label 12.5/600; activo fondo `#F0FDF4` texto `#16A34A`; hover `#F7F8F7`. Grupo 1: Inicio, Gastos fijos, Gastos, Presupuesto. Grupo 2: Patrimonio, Inversiones, Objetivos. Abajo: Ajustes.
- Topbar sticky blanca 54 px: título de página (PJS 18.9/700, tracking −0.4), selector de periodo centrado (chips Quincena / Mes / Año), a la derecha buscador, campana → Insights, avatar "JC" 36 px `#0B1F17` texto blanco → Ajustes.
- Main: `max-width:1264px`, padding `22px 24px 64px`. Inicio en grid `minmax(0,1.7fr) minmax(0,1fr)` gap 20; columna derecha con "Sube tu Excel" y Objetivos.

### Layout móvil
- Status bar 48 px ("9:41", batería verde), sin sidebar, main padding `14px 14px 120px`, todo en 1 columna.
- Tab bar flotante: `position:absolute; left/right 14px; bottom 14px; height 66px; background #0B1F17; border-radius 999px; box-shadow 0 14px 34px rgba(11,31,23,.35)`. Items: icono 22 px + label 10/600; activo `#4ADE80`, inactivo `rgba(255,255,255,.55)`. Botón central "+" 52 px círculo `#4ADE80` texto `#0B1F17` sombra `0 8px 20px rgba(74,222,128,.4)` → abre hoja "Más" (bottom sheet blanco radio 22 con lista de 60 px: Patrimonio, Inversiones, Objetivos, Insights, Importar, Ajustes).
- Drawers (detalle de tarjeta, evento de calendario, notificaciones) se abren dentro del teléfono, `max-width:100%`.

## Screens / Views

### 1. Inicio (`panel`)
1. **Tarjeta "Gasto actual"** (blanca, radio 14, sombra `0 1px 3px rgba(11,31,23,.09)`, padding 17/18.7): label 12.9/600 "Gasto actual", cifra PJS 27.5/700 tracking −1.1 (se re-anima `mmRise2` al cambiar), a la derecha chip comparativo vs periodo anterior (icono 13 px, texto 11 px). Debajo la **gráfica de quincenas**: 6 columnas; cada una es una pastilla 14 px de ancho, fondo `#EEF2EF`, radio 999, apilada: gasto abajo `#0B1F17` (inactivo `#7A8C84`), ingreso restante arriba `#4ADE80` (inactivo `#BBF7D0`). Al tocar: la pastilla escala `scaleX(1.25)` con sombra, transiciones `height .55s cubic-bezier(.34,1.56,.64,1)`, montos aparecen arriba con `mmRise2` (ingreso verde `#16A34A`, gasto `#0B1F17`, 10.5/700, escalonados 60 ms), chip de periodo (11/600) se pone `#0B1F17` blanco con `scale(1.08)`. Leyenda: puntos 10 px `#4ADE80` Ingresos / `#0B1F17` Gastos. Selector Quincena/Mes arriba a la derecha.
2. **"Cuentas"** (PJS 18/700). Fila "Agregar cuenta": tarjeta blanca borde `#EEF2EF` radio 16 alto 64, icono 40 px círculo `#F4F6F4` (tarjeta con +), botón `#0B1F17` píldora 11/20 "Agregar" (hover `#16A34A`) → modal de bancos. Debajo **carrusel de cuentas** (scroll-snap, gap 14): primera tarjeta punteada "Agregar tarjeta" (236 px, borde 2 px dashed `#C9D2CE`, fondo `#FAFBFA`, círculo verde 44 px con "+", 14/700 + sub 11); luego plásticos 236 px ratio 1.62 radio 14 con color de banco (Nu `#820AD1`, Amex `#006FCF`, BBVA `#072146`, GBM+ `#0B1F17`, Bitso `#16A34A`, Efectivo `#16A34A`), logo del banco 28 px arriba-derecha, "•••• 7710" 15/800 tracking 3 abajo-izquierda; bajo el plástico nombre 13/700 y saldo/deuda 12.5/700 azul `#2563EB`. Hover `translateY(-3px)`.
3. **Drawer detalle de cuenta** (fixed, derecha, 420 px web / 100 % móvil): header con logo 36 px, nombre, cerrar ×. Plástico oscuro `#0B1F17` radio 22 centrado: píldora "•••• 7710" con chip verde 18×13, "Saldo al corte · periodo" 11 gris, monto PJS 32/700, 4 acciones redondas 46 px `rgba(255,255,255,.12)` (Pagar, Estado, Recordar → calendario de Fijos, Gastos → Gastos filtrado). Grid 3 cifras (Sin intereses `#F0FDF4`, Mínimo, Límite). Para **cuentas de inversión**: tarjeta "Cómo va tu inversión" con línea SVG 300×100 verde `#16A34A` 2.5 px, área `rgba(22,163,74,.10)`, punto final 5 px, rendimiento a la derecha 12/700 verde; tabla "En qué estás invertido" (logo 42 px, nombre 13.5/700, cantidad · % del portafolio 11, valor PJS 14.5/700, variación 11/700 verde o azul si negativa). Luego "Compras del periodo" / "Movimientos" (logo 42, 60 px alto) y botón "Ver más" 50 px 13/700 verde → Estado de cuenta. Para cuentas Nu con varias tarjetas: lista "Tarjetas de Nu conectadas".
4. **Historial de movimientos**: título 16/700 centrado + lupa 38 px `#F4F6F4`; chips 12.5/600 radio 999 borde `#E6ECE9` (activo `#BEF264` texto `#0B1F17`): Todos, Hoy, Últimos 2 días, Ingresos, Pagos. Lista agrupada Hoy / Ayer (label 10.5/700 uppercase tracking .8 + línea), filas 66 px radio 14: avatar 46 px círculo `#F4F6F4` con favicon 54 %, nombre 14/700, categoría · cuenta 11.5 gris, monto PJS 15/700 (ingreso `#16A34A`), tipo 11.5 gris. 5 recientes; "Ver todos" expande.
5. Columna derecha (web): fila compacta "Sube tu Excel" (`#0B1F17`, radio 12, 12/600, hover `#16A34A`) y bloque Objetivos.

### 2. Gastos (`gastos`)
- Selector de periodo (Semana / Mes / Personalizado con mini calendario rango).
- **Gráfica por mes** (blanca radio 22): flechas ‹ › 34 px, rejilla punteada `#E3E8E5` con etiquetas `$Xk` 10 `#8A958F` (4 líneas), barras 16 px radio 999 `#DCE6F5`, seleccionada `#2563EB`, monto arriba 10.3/700 (`#0B1F17` activo / `#6B7A74`), chip de mes activo `#2563EB` blanco. Transición 320 ms.
- **Cuentas** (carrusel circular, ref. cripto): círculos con logo, nombre y saldo; primero "+ Agregar"; seleccionado con aro `#16A34A` y palomita. Efectivo = círculo verde con "$". Seleccionar filtra la pantalla a esa cuenta; "Todas" muestra el total.
- **Top gastos** (blanca radio 18 padding 18): "Gasto total · rango" 12 gris, `$8,241` PJS 30/700 (símbolo 16 arriba); grid 2×2 de cifras (Promedio diario, vs mes pasado ▲, Movimientos, Mayor gasto) 10/13; mini dona 18 px en círculo 32 px; **barra segmentada** 14 px radio 7 gap 4 con % dentro (9/700 blanco); grid 2 columnas de tarjetas de categoría (borde `#EEF2EF` radio 14): punto 8 px + nombre 11.5/600 en color de categoría, monto PJS 17/700, "% del gasto" + variación ▲/▼ 10.5. Aviso "Categorías inteligentes" `#FFFBEB` con check `#F59E0B`. Colores de categoría: Fijos `#0B1F17`, Comida `#16A34A`, Transporte `#2563EB`, Compras en línea `#6366F1`.
- Agregar **gasto en efectivo**: bajo las cuentas, fila "Agregar efectivo" con concepto + monto, botón verde.
- Detalle de cuenta desde Gastos (`gaDet`): "‹ Mis tarjetas", plástico 112×72 (o cuadro verde 72 px con "$" para Efectivo), movimientos y desglose por concepto.
- Historial (mismo componente que Inicio).

### 3. Gastos fijos (`recurrentes`)
- Cifras arriba (total mensual, suscripciones, servicios, MSI).
- **Tablas por categoría** en carrusel horizontal (330 px, `#0B1F17` texto blanco radio 16, sombra `0 6px 20px rgba(11,31,23,.18)`): Suscripciones, Cargos de la casa, Meses sin intereses, Colegiaturas… Header: título 13.3/700, total PJS 19/700; filas con logo, nombre, día de cobro, monto; máx alto 264 scroll.
- Detalle de suscripción (drawer del mismo color del cuadro): meses pagando, precio actual, total pagado, % del ingreso; **botón grande verde "Cancelar suscripción"**; campana "Recordarme" → calendario.
- **Calendario** (vista semanal en fila, ref. círculos): flechas 32 px, mes + campana verde, días como círculos 36 px `#0B1F17` texto blanco, hoy `#4ADE80`, día con cargo con punto; al tocar un día se abre hoja con la lista de cargos (filas 64 px, logo 44). Formulario "Calendarizar un pago" (borde `#16A34A`).
- Botón "Nuevo recurrente" abre modal (nombre, monto, día, tipo).

### 4. Presupuesto (`presupuesto`)
- Título del mes PJS 22/700 + chips de periodo (Quincena / Mes / Año) + "Nuevo presupuesto".
- **Anillo de ticks** (tarjeta blanca radio 24): 60 líneas radiales SVG 220×220 (r 78→104, 4 px, round). Gastado = `#16A34A`, últimas 8 = `#4ADE80`, resto `#E3EFE6`. Centro: % PJS 40/700 + "gastado" 12 gris. Debajo: `$gastado`/`$límite` PJS 22/700, "$X libres" 12/700 verde, y "Te quedan $X/día".
- Dos tarjetas `#0B1F17` blancas radio 20: Ingreso (↓) y Gastado (↑), label 12/600 `#4ADE80`, monto PJS 22/700.
- **Tabla Presupuesto vs Actual**: columnas Categoría · Presupuesto (editable, input) · Actual · Diferencia ($) · % ; la celda Actual con fondo `rgba(127,140,134,.12)`. Fila excedida: **toda la tarjeta cambia a `#0B1F17` texto blanco**, barra `#4ADE80`, sombra `0 10px 26px rgba(11,31,23,.25)`; nunca rojo.
- Flujo "Nuevo presupuesto": modal grande (nombre, categoría, monto, periodo).

### 5. Patrimonio (`patrimonio`)
- Centro: "Patrimonio neto" 12.5 gris, monto PJS 44/700 tracking −2, variación 11.5/600 verde.
- Tres botones redondos 64 px (Activos, Pasivos, Agregar): activo `#16A34A` blanco sombra `0 10px 24px rgba(22,163,74,.32)`, inactivo `#E3EFE6`, Agregar `#0B1F17`. Debajo label 12/600 y sub 11.
- Panel Activos / Pasivos (swipe): tarjetas por rubro (Casa, Autos, Inversiones, Cripto, Efectivo / Tarjetas, Hipoteca, Auto) con barra de proporción, monto y "›". Deuda en azul `#2563EB` (no rojo). Tocar rubro → pantalla detalle (ej. Autos: Tahoe 2022, Suburban 2025; columna derecha estimación de depreciación anual "ligada a Kavak"). Agregar activo → pantalla dedicada por tipo (cripto, autos, propiedades…).
- **Estado de resultados · P&L** abajo: Ingresos, Gastos fijos, Gastos variables, Ahorro/inversión, Flujo neto.

### 6. Inversiones (`inversiones`)
- Total invertido, rendimiento; tarjeta "Conectar cuenta de inversión" (misma anatomía que agregar cuenta; al tocar salen GBM+, Bitso, CetesDirecto, Kuspit, bancos).
- Cuentas conectadas: logo, saldo, rendimiento; gráfica de línea por cuenta o total; comparación mensual.
- Nota legal 10.3 gris: "Información educativa, no es asesoría de inversión."

### 7. Objetivos (`objetivos`)
- Grupos (Ahorro, Deuda, Inversión) con icono 26 px en cuadro de color suave. Tabla oscura recortada `#0B1F17` radio 16: fila = palomita (checkbox 22 px, verde al completar), nombre 13.5/700, barra fina `#4ADE80` sobre `rgba(255,255,255,.12)`, avance `$x / $y` y fecha.

### 8. Insights (`insights`, campana)
- Chips de filtro arriba; tarjetas apiladas de color pleno (ref. Analytics) que se expanden al tocar. Copy formal. Sin variaciones "qué cambió".

### 9. Ajustes (`ajustes`, avatar)
- Lista estilo Nu: Perfil, Cuenta y seguridad, Notificaciones, Plan (→ Planes), Familia, Exportar datos, Cerrar sesión. Sub-pantallas con `mmScreen` (0.25 s) y ancho máx 520.

### 10. Planes (`premium`)
- Tarjetas radio 20: plan actual borde `#16A34A` fondo `#F0FDF4`; plan Patrimonio `#0B1F17` blanco. Toggle mensual/anual, botón 19/800 radio 11.

### 11. Landing, registro y onboarding
- Landing: hero verde `#16A34A`, titular PJS `clamp(34px,4.2vw,62px)`/700, formulario de correo, teléfono animado, cinta de marcas arrastrable, carrusel de funciones, testimonios, cierre.
- Correo / contraseña: header con logo, formulario centrado máx 420, botón `#0B1F17` radio 40. Validación de correo por regex.
- Onboarding (`#F4F4F2`): header blanco 80 px con progreso; paso 0 metas (cuadros que se encienden con degradado `#0B1F17 → #15803D → #16A34A`), paso 1 vincular cuentas (cascada de logos + modal Belvo), paso 2 quincena (días de pago default 5 y 20), paso 3 plan (botón "Empezar 7 días gratis"), paso 4 resumen → `fase:'app'`.

## Interactions & Behavior
- Navegación: `setState({tab})`; drawers/hojas con overlay `rgba(11,31,23,.35–.45)`; cerrar con × u overlay.
- Pantallas nuevas: `mmScreen` (fade + translateY 8 px, 250 ms `cubic-bezier(.2,.8,.2,1)`). Sheets: `mmSheet` 250 ms desde abajo.
- Hover: fondos `#FAFBFA`/`#F7F8F7`, botones oscuros → `#16A34A`, plásticos `translateY(-3px)` 180 ms.
- Gráficas: siempre animar el cambio de selección (300–550 ms, easing con rebote `cubic-bezier(.34,1.56,.64,1)` en Inicio). Los números solo aparecen en el elemento seleccionado.
- Formularios: inputs `#F4F4F2` borde `#E5E7EB` radio 12, focus borde `#16A34A`; botón deshabilitado `#C9D2CE`.
- Vacíos: cada tab tiene estado vacío (icono, título, texto, CTA) cuando no hay cuentas.
- Reglas de color: **nunca rojo**. Negativo/deuda/exceso = `#2563EB` azul o inversión a `#0B1F17`. Positivo = `#16A34A` / `#4ADE80`.
- Sin emojis en UI. Español mexicano, tuteo, tono formal. Moneda `$12,450` (es-MX, sin decimales).

## State Management
Estado raíz (prototipo, un solo objeto):
`fase, paso, tab, periodo ('q'|'mes'|'anio'), vista ('web'|'mobile'), tema ('claro'|'oscuro'), sbExp, masAbierto, heroSel, gaMes, gaQuien, gaTarjetaDet, gaRango, tjSel, movsRango, movsAll, recSec, calVista, calDia, calForm, prPeriodo, prEd (presupuestos editados), pnVista ('act'|'pas'), pnForm, objetivos[], gastosFijos[], ingreso, metas[], plan, modal, bancoSel, notifAbierto, ajustesSec, chat, ocultar (saldos)`.
Datos mock: cuentas/tarjetas (`TJ`), movimientos, recurrentes, categorías, presupuestos, patrimonio, inversiones (serie + posiciones), insights. En producción: Belvo (cuentas, transacciones), motor de categorización, presupuesto por quincena, recurrentes/MSI, auth, pagos.

## Design Tokens
Ver `tokens.css` y `design-tokens.json`.

Colores
- Primario `#16A34A`; primario oscuro `#15803D`; acento claro `#4ADE80`; lima chip activo `#BEF264`; verde suave `#F0FDF4`, `#E3EFE6`, `#BBF7D0`, `#CFE6D6`, `#EAF7EE`.
- Tinta / superficies oscuras `#0B1F17`.
- Azul (gasto, deuda, negativo) `#2563EB`; azul suave `#DCE6F5`, `#E8F0FE`, `#D6E2F5`.
- Índigo (compras en línea, inversión) `#6366F1` / `#EEF2FF`.
- Ámbar solo para avisos `#F59E0B` / `#FFFBEB`.
- Fondos `#FFFFFF`, `#F7F8F7`, `#F4F6F4`, `#F4F4F2`, `#F0F2F0`, `#FAFBFA`; marco del prototipo `#E9EEEB`.
- Bordes `#EEF2EF`, `#E6ECE9`, `#E5E7EB`, `#E3E8E5`, `#F0F0EE`; punteado `#C9D2CE`, `#D9E1DD`.
- Texto secundario `#5F6B67`, `#6B7A74`, `#6B7280`; terciario `#8A958F`, `#9CA3AF`; inactivo `#7A8C84`.
- Bancos: Nu `#820AD1`, Amex `#006FCF`, BBVA `#072146`, GBM+ `#0B1F17`, Bitso `#16A34A`.

Tipografía (Google Fonts)
- Display: **Plus Jakarta Sans** 500–800 — títulos y cifras. Tracking negativo proporcional (−0.3 a −2 px).
- Cuerpo: **Inter** 400–700. `font-variant-numeric: tabular-nums` global.
- Escala: 10 / 10.3 / 10.5 / 11 / 11.5 / 12 / 12.5 / 13 / 13.5 / 14 / 14.5 / 15 / 16 / 17 / 18 / 18.9 / 22 / 27.5 / 30 / 32 / 34 / 40 / 44.
- Labels de sección: 10.3–10.5/700, uppercase, tracking 0.9 px, `#5F6B67`.

Espaciado: 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24. Gap de listas 12–14; padding de tarjeta 14–18.
Radios: chips/píldoras 999; inputs 12; tarjetas 14–18; tarjetas grandes 20–24; sheet 22–24; teléfono 58/48.
Sombras: `0 1px 3px rgba(11,31,23,.09)` tarjeta; `0 6px 18px rgba(11,31,23,.12)` hover; `0 6px 20px rgba(11,31,23,.18)` oscura; `0 14px 34px rgba(11,31,23,.35)` tab bar; `0 10px 24px rgba(22,163,74,.32)` botón verde activo.
Movimiento: 160–180 ms micro; 250 ms pantallas; 300–550 ms gráficas. Easings `cubic-bezier(.2,.8,.2,1)` y rebote `cubic-bezier(.34,1.56,.64,1)`.

Dark (a implementar con tokens): fondo `#0F1412`, superficie `#16201B`, borde `rgba(255,255,255,.08)`, texto `#F5F7F6`, secundario `rgba(255,255,255,.6)`, acento `#4ADE80`. Todos los botones primarios en oscuro van blancos con texto `#0B1F17`.

## Assets
- Logos de bancos/comercios: favicons `https://www.google.com/s2/favicons?domain=<dominio>&sz=256` (solo prototipo). En producción reemplazar por SVG oficiales en `/public/logos`.
- Iconos: trazos 2 px estilo Lucide (paths inline en el HTML). Usar `lucide-react`.
- No hay imágenes rasterizadas propias.

## Files
- `design-reference/MoneyMaker Web.dc.html` — prototipo completo (web + móvil + oscuro). Necesita `support.js` al lado.
- `design-reference/MoneyMaker Mobile.dc.html` — exploración móvil anterior (referencia secundaria).
- `design-reference/MoneyMaker Plan de Negocio.dc.html`, `MoneyMaker Documentación.dc.html` — contexto de negocio y documentación.
- `tokens.css`, `design-tokens.json` — tokens listos para Tailwind/CSS.
- `FLUJOS.md` — flujos de usuario paso a paso.
- `CLAUDE.md` — reglas para Claude Code. `TAREAS.md` — backlog en orden.
- `screenshots/` — capturas web y móvil de cada pantalla.
