# Backlog para Claude Code

Cada punto es un prompt que puedes pegar tal cual.

## Fase 0 · Arranque
1. "Crea un proyecto Next.js 14 (App Router, TypeScript, Tailwind) llamado moneymaker. Lee README.md, CLAUDE.md y design-tokens.json. Configura Plus Jakarta Sans + Inter con next/font y carga los tokens de color, radios y sombras en tailwind.config y tokens.css. Agrega soporte de tema con data-theme."
2. "Crea el shell de la app: layout web (sidebar 208 px colapsable + topbar 54 px con título, chips de periodo, buscador, campana y avatar JC) y layout móvil (status bar, 1 columna, tab bar flotante oscura con + central que abre bottom sheet 'Más'). Rutas: /app, /app/gastos, /app/fijos, /app/presupuesto, /app/patrimonio, /app/inversiones, /app/objetivos, /app/insights, /app/ajustes, /app/importar."
3. "Crea /lib/mock con cuentas (TJ), movimientos, recurrentes, categorías, presupuestos, patrimonio e inversiones tomando los valores del prototipo. Crea /lib/services con interfaces para Belvo, auth, pagos y categorización."

## Fase 1 · Pantallas (referencia visual exacta: design-reference/MoneyMaker Web.dc.html + screenshots/)
4. Inicio: tarjeta Gasto actual con pastillas de quincena animadas; fila Agregar cuenta; carrusel de plásticos con tarjeta punteada Agregar tarjeta; drawer de detalle de cuenta (crédito, débito, inversión con línea y posiciones); historial de movimientos con chips y grupos Hoy/Ayer; columna derecha Sube tu Excel y Objetivos.
5. Gastos: selector Semana/Mes/Personalizado con mini calendario; carrusel circular de cuentas; gráfica de barras por mes; Top gastos con barra segmentada y tarjetas de categoría; Agregar efectivo; historial.
6. Gastos fijos: cifras; carrusel de tablas oscuras por categoría; drawer de suscripción con Cancelar (verde grande) y Recordarme; calendario semanal de círculos con hoja de cargos; Nuevo recurrente; Calendarizar pago.
7. Presupuesto: anillo de ticks; tarjetas Ingreso/Gastado; tabla Presupuesto vs Actual editable con estado excedido oscuro; Nuevo presupuesto.
8. Patrimonio: neto, botones Activos/Pasivos/Agregar, paneles con rubros, detalle de rubro (Autos con depreciación), pantallas de agregar por tipo, P&L.
9. Inversiones, Objetivos, Insights, Ajustes (con Familia), Planes, Importar Excel, estados vacíos.

## Fase 2 · Landing y onboarding
10. Landing: hero verde, formulario de correo, teléfono animado, cinta de marcas arrastrable, carrusel de funciones, testimonios, cierre.
11. Registro correo → contraseña → onboarding 5 pasos (metas que se encienden, vincular cuentas con Belvo, quincena, plan, resumen) → panel personalizado según metas.

## Fase 3 · Datos reales
12. Auth (Clerk o NextAuth). 13. Belvo: widget + sync a Postgres (Supabase). 14. Pagos Stripe/Conekta para Premium con 7 días de prueba. 15. Motor de quincena, categorización y detección de recurrentes/MSI. 16. Integración de valuación de autos (Kavak) y precios cripto. 17. Reemplazar favicons por SVG oficiales en /public/logos.

## Criterios de aceptación visual
- Cada pantalla comparada lado a lado con el prototipo en Web (1380 px) y Mobile (393 px), claro y oscuro.
- Solo colores de design-tokens.json; sin rojo; sin emojis.
- Animaciones de gráficas al seleccionar; números solo en el elemento seleccionado.
