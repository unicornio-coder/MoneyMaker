# Mejoras de diseño y flujos (11 nov 2026)

Lista priorizada de lo que más acercaría MoneyMaker a las mejores apps de finanzas personales. Sigue donde se
quedó `docs/DIAGNOSTICO.md` (5 oct).

**En qué se basa.** La landing y el login se revisaron en producción hoy. Las pantallas de la app se revisaron con
las capturas de `docs/capturas/diagnostico/` (5 oct, el código de esas pantallas no cambió desde entonces) y
leyendo el código. No se recorrió la app con una cuenta en producción: hace falta que alguien inicie sesión.
Las comparaciones con otras apps son patrones generales de la categoría (Rocket Money, Copilot, Monarch, Nu,
Revolut), no una auditoría pantalla por pantalla de cada una.

**Regla.** Nada de esto cambia la paleta ni la tipografía (`CLAUDE.md`). El sistema visual ya es consistente; lo que
falta es jerarquía y respuesta a la pregunta principal del usuario.

## Hecho hoy

| # | Qué | Por qué |
|---|---|---|
| 1 | Inicio: la tarjeta de saldo neto ahora dice "Te quedan $X · N días" y lleva a Presupuesto | El título del sitio promete "Sabe cuánto te queda esta quincena" y la pantalla principal no lo decía. Es la misma cifra del bot de Telegram |
| 2 | Gmail: el aviso de error dice el motivo y qué hacer | Decía "No pudimos conectar Gmail. Intenta de nuevo." para seis fallas distintas. En producción nadie ha logrado conectarlo |
| 3 | Vista previa al compartir el enlace (Open Graph e imagen) | Al pegar el link en WhatsApp salía sin título ni imagen |
| 4 | Ajustes: tarjeta para conectar Telegram | Punto de entrada del bot |

## Siguiente, por impacto

### A. Jerarquía de Inicio (alto impacto, riesgo medio)
1. **La cifra principal debería ser "te queda", no "saldo neto".** Las apps de presupuesto abren con lo que puedes
   gastar hoy; el patrimonio va en segundo plano. Hoy quedó como una línea dentro de la tarjeta; el siguiente paso
   es invertir el orden: "Te quedan" en grande con su barra de avance, saldo neto debajo.
2. **Escritorio desperdicia la mitad de la pantalla.** A 1440 px, Inicio usa una columna de unos 500 px y deja vacío
   el lado derecho, mientras Suscripciones sí usa todo el ancho. Propuesta: dos columnas (resumen y cuentas a la
   izquierda; próximos cobros y movimientos a la derecha).
3. **"Próximos cobros" merece estar arriba.** En Inicio aparece como una fila dentro de Suscripciones. Es el dato
   que evita un sobregiro; conviene una franja propia con los cobros de los próximos 7 días.

### B. Navegación (impacto medio, riesgo bajo)
4. **Orden y nombres distintos entre móvil y escritorio.** Móvil: Inicio, Gastos, +, Plan, Suscripciones.
   Escritorio: Inicio, Suscripciones, Gastos, Presupuesto, Inversiones. La misma sección se llama "Plan" y
   "Presupuesto". Unificar el orden y usar un solo nombre.
5. **Patrimonio sigue como ruta sin entrada en el menú** (pendiente 23 del diagnóstico). Integrarlo en Inversiones o
   quitarlo.

### C. Presupuesto (impacto alto, riesgo bajo)
6. **Categorías en "$0 gastado" mientras el total dice que sí se gastó.** En la captura, el encabezado marca $435
   gastados y todas las líneas visibles están en $0; lo más probable es que el gasto caiga en una categoría sin línea de presupuesto (falta confirmarlo con datos).
   Hay que mostrar una línea "Sin presupuesto" o crearla sola, para que la suma de las líneas dé el total.
7. **Los campos de monto parecen formularios.** Copilot y Monarch muestran la barra y el número, y editan al tocar.
   Aquí cada categoría trae un campo de texto siempre visible, que pesa visualmente más que el avance.

### D. Entrar y primer uso (impacto alto, riesgo bajo)
8. **Entrar con Google está apagado** (`NEXT_PUBLIC_LOGIN_GOOGLE`). Es el camino más corto en móvil. Requiere las
   llaves de Google en Supabase (pendiente 26 del diagnóstico, solo JC).
9. **El enlace por correo depende de que el correo llegue.** Sin Resend configurado (`correo: false` en
   `/api/health`), los enlaces salen por el servicio de pruebas de Supabase, que tiene un límite por hora muy
   bajo. Antes de dar la app a usuarios hay que configurar el proveedor de correo.
10. **Onboarding promete conectar el banco y el camino real es el PDF.** La landing dice "Tu banco vía Belvo o el
    estado de cuenta". Mientras Belvo no tenga banca habilitada, poner primero el PDF en los tres pasos.

### E. Landing (impacto medio, riesgo bajo)
11. **Mucho aire muerto entre el hero y la primera sección en móvil.** Entre la franja de bancos y "Todo tu dinero,
    en un lugar" hay casi una pantalla vacía.
12. **Precio sin ancla.** "Plus por menos de $5 al día" compite con "$149 al mes". Una sola forma de decirlo, y al
    lado el ahorro típico detectado ("$378 al mes en suscripciones en el ejemplo") para que el precio se pague solo.
13. **Sin prueba real.** No hay número de usuarios ni testimonios, y está bien no inventarlos. Sí se puede mostrar
    cuántas instituciones lee y cuánto tarda un PDF, que son verificables.

### F. Detalles (impacto bajo)
14. Calendario de Suscripciones muestra una semana y titula con el mes (pendiente 20 del diagnóstico).
15. Modales "Nuevo recurrente" y "Nueva meta" usan selects y fecha nativos (pendiente 21).
16. Inbursa sin logo en "Vincular banco" (pendiente 22).
17. 42 de 46 imágenes de la landing no tienen texto alternativo. Las decorativas están bien vacías; las de las
    capturas de la app deberían describir la pantalla.

## Solo JC
- Aviso de privacidad con "[DOMICILIO]" sin llenar.
- Llaves de Google (login), Resend (correos), Stripe (cobros) y VAPID (avisos push).
- Regenerar el token del bot de Telegram (`/revoke` en BotFather), porque se compartió en una conversación.
