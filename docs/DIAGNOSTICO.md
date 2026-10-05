# Diagnóstico de la app y la landing (5 oct 2026)

Revisión completa con datos de prueba: 16 pantallas × móvil (390 px) y escritorio (1440 px), 30 estados interactivos
(hojas, modales, drawers, pasos del onboarding, ajustes, legales) y lectura de todos los textos. Capturas en
`docs/capturas/diagnostico/`. Cada punto dice qué está mal, dónde y qué se hace. **Hecho** = corregido en el PR de
este diagnóstico; **Siguiente** = queda para la siguiente tanda; **JC** = solo lo puede hacer él.

## Lo que está bien (no tocar)
- Paleta, tipografía, radios y sombras consistentes en claro y oscuro. Sin rojo. Sin emojis.
- Inicio, Gastos (pastel nuevo), drawer de cuenta, drawer de suscripción, cancelación en 3 botones, Ayuda, Planes,
  Importar, login y registro por correo: se ven y se leen bien.
- Accesibilidad: axe en verde salvo el azul de gasto en oscuro (documentado).

## Landing
1. **Capturas desactualizadas** (hero y "Así se ve"): muestran el Inicio con lista de cuentas y Gastos con tiles, que ya
   no existen; la de Suscripciones trae media pantalla vacía. **Hecho**: se regeneran desde la app actual.
2. **"Patrimonio y objetivos"** en la lista de precio: Patrimonio ya no es pestaña y "objetivos" se llama Metas.
   **Hecho**: "Inversiones y metas".
3. **Falta "cómo funciona" y preguntas frecuentes**: la página explica qué hace, no qué tiene que hacer el usuario ni
   resuelve dudas (¿es seguro?, ¿ven mi contraseña?). **Hecho**: franja de 3 pasos bajo las marcas y 4 preguntas
   (las mismas de Ayuda) antes del precio.
4. "sin usar 3 meses" se parte en dos líneas en móvil. **Hecho**: no se parte.
5. Versión en el pie: "0.1.0" sale de `package.json`. **Hecho**: 0.4.0.

## App: textos
6. Onboarding: "Bienvenido a MoneyMaker" asume género. **Hecho**: "Te damos la bienvenida a MoneyMaker" (también el
   correo de bienvenida y el título de la pestaña).
7. Cancelar una suscripción: "desde hace 1 cobros". **Hecho**: singular/plural.
8. Avisos: "Gimnasio Del Valle $650 el 11" (¿el 11 de qué?). **Hecho**: "el 11 oct".
9. Importar: el título "Importar estado de cuenta" se corta en la barra móvil, y la pantalla repite "Sube tu estado de
   cuenta" / "Sube tus estados de cuenta"; el botón móvil "Abrir desde Archivos o Correo" confunde. **Hecho**: título
   "Importar", caja "Tus estados de cuenta en PDF", botón "Elegir PDF".
10. Inicio, tarjeta punteada: "Agregar tarjeta · Crédito, débito o inversión" pero abre "Agregar cuenta". **Hecho**:
    "Agregar cuenta · Banco, tarjeta o PDF".
11. Drawer de tarjeta: tile "Sin intereses" no se entiende. **Hecho**: "Pago sin intereses".
12. Categoría "Fijos" (en Presupuesto y detalle de movimiento) choca con la pestaña "Suscripciones". **Hecho**:
    "Cargos fijos".
13. Metas: "0 de 0 completadas" cuando no hay ninguna. **Hecho**: se oculta.
14. Avisos: el bloque "Metas" aparece vacío sin explicación. **Hecho**: texto de estado vacío con enlace.
15. Ajustes → Cuenta y seguridad: dice "cierra sesión y usa ¿Olvidaste tu contraseña?", pero el inicio de sesión ya es
    por enlace y ese botón no existe. **Hecho**: formulario para crear o cambiar la contraseña ahí mismo.
16. Buscador (⌘K): sigue ofreciendo "Patrimonio", que ya no es pestaña. **Hecho**: fuera.

## App: diseño y flujos
17. **Suscripciones: media pantalla vacía** debajo de las tablas (móvil y escritorio). **Hecho**: lista "Próximos
    cobros" (30 días) con fecha, nombre y monto debajo de las tablas; tocar abre el detalle.
18. **Presupuesto: encabezado apretado en móvil** ("Gastado · Quincena 2 de septiembre 2026 (último periodo con
    datos)" + "de $5,150" se encima) y los montos editables sin separador de miles ("1450" junto a "$1,250 libres").
    **Hecho**: etiqueta en dos líneas y montos con separador.
19. Presupuesto escritorio: tres veces el periodo (chips en la barra, título "Quincena 2 de septiembre 2026" y de
    nuevo en la tarjeta). **Hecho**: fuera el título repetido.
20. Calendario de Suscripciones: muestra una semana pero el título dice "Octubre 2026". **Siguiente**: título con el
    rango de la semana.
21. Modal "Nuevo recurrente" y "Nueva meta": selects y fecha nativos (se ven distintos al resto). **Siguiente**.
22. Vincular banco: Inbursa sin logo (círculo vacío). **Siguiente**: logo local.
23. Patrimonio sigue existiendo como ruta (`/app/patrimonio`) aunque no está en la navegación. **Siguiente**: decidir
    si se integra en Inversiones o se elimina.

## Solo JC
24. Aviso de privacidad: "[DOMICILIO]" sin llenar y "Borrador sujeto a revisión legal". Falta domicilio y revisión de
    un abogado antes de cobrar.
25. Belvo: habilitar banca (paso 5h de `docs/PROMPTS-MAESTROS.md`). Hasta entonces el botón de conectar banco avisa y
    manda al PDF.
26. Correos (Resend), cobros (Stripe), avisos push (VAPID) y Google: las llaves de los pasos 5c–5e.
