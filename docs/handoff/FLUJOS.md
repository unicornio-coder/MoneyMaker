# Flujos de usuario

Cada flujo indica pantalla → acción → resultado. Nombres de estado entre paréntesis corresponden al prototipo.

## 1. Alta y onboarding
1. Landing → "Empezar registro" con correo → (`fase:'correo'`) valida regex → (`password`).
2. Contraseña → acepta términos → (`onb`, paso 0) **Metas**: elige 1+ cuadros (se encienden); chips "lo que se activa en tu panel".
3. Paso 1 **Vincular cuentas**: buscar banco / cascada de logos → modal Belvo (usuario, contraseña, consentimiento) → cuenta conectada. Se puede saltar.
4. Paso 2 **Quincena**: días de pago (default 5 y 20) e ingreso.
5. Paso 3 **Plan**: "Empezar 7 días gratis".
6. Paso 4 **Resumen** → entra a la app (`fase:'app', tab:'panel'`). El panel se acomoda según las metas (tarjetas "Para ti", orden de secciones). Perfiles previstos: padre de familia (gastos por hijo), oficinista, estudiante, ejecutivo.

## 2. Cambiar de vista y tema (solo prototipo)
Barra superior del prototipo: Web / Mobile app y Claro / Oscuro. Cualquier pantalla se conserva al cambiar.

## 3. Inicio → explorar gasto
1. Tocar una pastilla de quincena → se resalta, muestra ingreso y gasto, "Gasto actual" cambia con animación.
2. Quincena / Mes cambia la serie (6 quincenas o 6 meses).

## 4. Agregar cuenta o tarjeta
1. Inicio → fila "Agregar cuenta" → botón **Agregar**, o primera tarjeta punteada del carrusel "Agregar tarjeta".
2. Modal de bancos (buscar, lista con logos, incluidos GBM+, Bitso, CetesDirecto, Kuspit) → Belvo → la cuenta aparece en el carrusel con su color.
3. Al tocar la nueva cuenta se abre su detalle (drawer).

## 5. Detalle de cuenta / tarjeta
- Tarjeta de crédito: plástico oscuro con saldo al corte; acciones Pagar, Estado, Recordar (→ calendario Fijos), Gastos (→ Gastos filtrado a esa tarjeta). Cifras Sin intereses / Mínimo / Límite. Compras del periodo → "Ver más" → Estado de cuenta (lista completa por mes, filtros de fecha).
- Débito: saldo, movimientos, "Ver más" → Estado de cuenta.
- Nu con varias tarjetas: lista "Tarjetas de Nu conectadas" → tocar una abre su detalle.
- Inversión (GBM+, Bitso): línea "Cómo va tu inversión" con rendimiento, tabla "En qué estás invertido" (BTC, ETH… con logos), movimientos.

## 6. Gastos
1. Elegir periodo: Semana / Mes / Personalizado (mini calendario: fecha inicial y final, o un solo día).
2. Elegir cuenta en el carrusel circular (o "Todas") → Top gastos, gráfica por mes e historial se filtran.
3. Tocar categoría → detalle por categoría (movimientos de esa categoría).
4. **Agregar efectivo**: concepto + monto → botón verde → aparece como movimiento con la cuenta "Efectivo".
5. Historial: chips Todos / Hoy / Últimos 2 días / Ingresos / Pagos; "Ver todos" expande; tocar movimiento → detalle (categoría editable).

## 7. Gastos fijos
1. Carrusel de tablas por categoría (Suscripciones, Cargos de la casa, MSI…). Tocar una fila → drawer del mismo color con: meses pagando, precio actual, total pagado, % del ingreso, **Cancelar suscripción** (grande, verde) y campana **Recordarme** → calendario con recordatorio creado.
2. Calendario semanal en fila → tocar día → hoja con los cargos del día → tocar cargo → detalle.
3. "Nuevo recurrente" → modal (nombre, monto, día, tipo) → aparece en su tabla y en el calendario.
4. "Calendarizar un pago" (formulario con borde verde) → evento en calendario.

## 8. Presupuesto
1. Ver anillo de ticks y tarjetas Ingreso / Gastado.
2. Tabla Presupuesto vs Actual: editar el monto de Presupuesto inline → recalcula diferencia y %; si Actual > Presupuesto, la tarjeta se vuelve oscura.
3. "Nuevo presupuesto" → modal grande (nombre, categoría, monto, periodo) → nueva fila.
4. Cambiar Quincena / Mes / Año recalcula todo.

## 9. Patrimonio
1. Patrimonio neto arriba; botones Activos / Pasivos cambian el panel; Agregar abre pantalla dedicada según el tipo (cripto, autos, propiedades, efectivo, deuda).
2. Tocar un rubro (ej. Autos) → pantalla detalle: lista de items (Tahoe 2022, Suburban 2025…), editar, y estimación de depreciación anual (integración futura Kavak). Cripto muestra posiciones con logos.
3. P&L abajo: ingresos, fijos, variables, ahorro/inversión, flujo neto; tocar → pantalla P&L completa (`pnl`).

## 10. Inversiones
1. Total invertido y rendimiento; "Conectar cuenta de inversión" → lista GBM+, Bitso, CetesDirecto, Kuspit, bancos.
2. Cuentas conectadas → tocar → detalle con línea, posiciones y movimientos. Selector: una cuenta o total, comparación por meses.

## 11. Objetivos
Tabla oscura por grupo; marcar palomita completa el objetivo; barra de avance; "Nuevo objetivo" (nombre, monto, fecha, cuenta vinculada).

## 12. Insights (campana)
Chips de filtro → tarjetas apiladas de color; tocar expande la tarjeta con detalle y CTA (ej. "Cancelar ahora" → Fijos).

## 13. Ajustes (avatar JC)
Perfil, Cuenta y seguridad, Notificaciones, Plan (→ Planes), Familia (miembros y gastos por familiar), Exportar, Cerrar sesión.

## 14. Importar Excel
Inicio → fila "Sube tu Excel" → pantalla de carga (drag & drop) → mapeo de columnas → llena presupuesto, recurrentes y cuentas.
