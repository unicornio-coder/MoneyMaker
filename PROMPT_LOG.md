# PROMPT_LOG.md — Assignment 2: Primera funcionalidad real end-to-end

**Curso:** Applied Algorithmic Thinking · **Alumno:** Juan Carlos (JC) · **Proyecto:** MoneyMaker
**Función:** Billy, el asistente que contesta "¿cuánto me queda?" con las cifras de la app

| Entregable | Enlace |
|---|---|
| Deploy | https://money-maker-tawny.vercel.app |
| Repositorio | https://github.com/unicornio-coder/MoneyMaker |
| Bitácora | este archivo |

> **Cómo se armó esta bitácora.** Las citas entre comillas son mensajes literales de JC a la IA durante la
> construcción (11 de noviembre de 2026), con su ortografía original. La IA las ordenó; no redactó las decisiones
> ni las razones. Donde algo lo propuso o lo encontró la IA y no JC, se dice.

---

## Paso 1 · Especificación

### La función, como la escribió JC (Pre-Class Work de la Sesión 19, opción 2 de 3)

> "**Bot de Telegram '¿Cuánto me queda?'.** Un bot creado con BotFather donde el usuario vincula su cuenta de
> MoneyMaker y pregunta en lenguaje natural cuánto le queda hasta su quincena o cuánto paga de suscripciones; la
> función toma los datos ya calculados en la app y le pide a Claude que redacte la respuesta en una o dos líneas,
> sin inventar cifras."

### Los tres campos

| Campo | Especificación | De dónde sale |
|---|---|---|
| 1. Qué hace | El usuario pregunta en lenguaje natural cuánto le queda hasta su quincena o cuánto paga de suscripciones, y recibe la respuesta en una o dos líneas. | Texto de JC, arriba |
| 2. Qué datos necesita | Los datos ya calculados en la app: lo que queda del presupuesto de la quincena (pantalla Presupuesto) y las suscripciones activas (pantalla Suscripciones). El texto de la pregunta lo escribe el usuario. Claude solo redacta. | Texto de JC ("toma los datos ya calculados en la app") |
| 3. Cómo se sabrá que funciona | La respuesta no trae ninguna cifra inventada, y "la cifra del bot [es] igual a la de la app". Caso: preguntar "¿Cuánto me queda?" y comparar contra "Te quedan" en Presupuesto de la misma cuenta. | "Sin inventar cifras" es de JC. El criterio de comparación lo redactó la IA en el plan de trabajo y JC lo adoptó al reenviarlo como instrucción |

### Cambio a la especificación durante la construcción

La función empezó como bot de Telegram y terminó dentro de la app. Fue decisión de JC (entrada 5).
Los campos 2 y 3 no cambiaron: mismos datos y mismo criterio.

---

## Paso 2 · Construcción: prompts y decisiones

### Entrada 1 · Qué función construir — RECHAZAR
- **Propuesta de la IA:** construir el botón "Cancelar". "La 3 es la única que se termina hoy con seguridad, y es
  el foco que tú mismo le diste al producto."
- **Decisión y razón de JC:** "lo de chatbot , es senicllo a traves de botfather , segun yo"
- **Resultado:** se construyó el bot. PR #60, commit `d1fc826`.

### Entrada 2 · Cómo se entra a la app — RECHAZAR
- **Lo que había (propuesta original de la IA, de septiembre):** entrar con un enlace enviado por correo, sin contraseña.
- **Decisión y razón de JC:** "Actualmente nos manda un mail a mi cuenta para entrar y no me deja entrar. Entonces lo
  que necesito que hagas es que para entrar únicamente pida mail, que se registre con sus datos, mail, contraseña."
- **Verificación:** la IA revisó los registros de Supabase y confirmó la falla que JC reportó: el enlace se canjeaba
  desde una IP de Google segundos después de enviarse, antes de que él lo abriera.
- **Resultado:** acceso con correo y contraseña. PR #63.

### Entrada 3 · Entrar y crear cuenta — REVISAR
- **Lo que entregó la IA:** dos pantallas separadas, `/login` y `/registro`.
- **Decisión y razón de JC:** "Es muy importante que el flujo de crear cuenta o entrar que esté en el mismo, porque está
  separado y son dos pantallas." Y: "si yo me quiero regresar del registro [...] no hay botón para ir, entonces me
  quedo atorado en esa misma pantalla."
- **Resultado:** una pantalla con pestañas y "Volver al inicio". PR #64.

### Entrada 4 · Dónde vive el bot — ERROR QUE DETECTÓ JC
- **Lo que entregó la IA:** el bot se conectaba desde Ajustes → Cuentas conectadas, al fondo, entre Gmail y Bitso.
  Las pruebas pasaban y la IA lo reportó como terminado.
- **Lo que encontró JC al probar en producción:** "no encuentro el chatbot que quedamos poner en aquí mismo con Telegram."
- **Por qué es un error de fondo y no de sintaxis:** el código funcionaba. Lo que fallaba era que un usuario real no
  podía llegar a la función. La IA no lo señaló.
- **Resultado:** sección propia en Ajustes y tarjeta en Inicio. Commit `b71bb31`.

### Entrada 5 · Telegram o dentro de la app — RECHAZAR (cambia la especificación)
- **Lo que entregó la IA:** la tarjeta de Inicio llevaba a conectar Telegram.
- **Decisión y razón de JC:** "Me está mandando Telegram. Eso está mal. Necesito que el chatbot esté dentro de la
  aplicación. Que se inicie solo y que conteste solo. Quiero ver si eso es posible y rápido. Y si no, quítalo."
  También le puso nombre: "Ponle como Billy."
- **Resultado:** Billy en `/app/billy`, abre contestando solo. Telegram queda como canal opcional. PR #65.

### Entrada 6 · Conexión bancaria — RECHAZAR
- **Lo que había:** el onboarding ofrecía "Conectar mi banco" como opción principal.
- **Decisión y razón de JC:** "Conectar mi banco, elimínalo, no existe ahorita. Solo pon subir estado de cuenta."
- **Resultado:** PR #65 (onboarding) y PR #66 (resto de la app).

### Entrada 7 · Un error de fondo que encontró la IA, no JC
La primera versión del bot calculaba siempre la quincena en curso. La pantalla de Presupuesto muestra el último
periodo con datos cuando la quincena actual está vacía. A un usuario con estados de cuenta de agosto, el bot le
habría dicho "llevas $0 de $9,000": una cifra que no es inventada pero no contesta la pregunta. Las 189 pruebas
pasaban. Lo encontró la IA al comparar su código contra Presupuesto. Corrección en el commit `e62791f`.
JC no participó en este hallazgo; se registra así porque es lo que pasó.

### Entrada 8 · Decisiones técnicas de la IA que JC no revisó
Tabla propia para los chats, código de vinculación firmado de 15 minutos, y definir "lo que me queda" como límite
del presupuesto menos lo gastado (no ingreso menos lo gastado). Están en el commit `d1fc826`. JC las aceptó sin
revisarlas; no hay una razón suya registrada.

---

## Paso 3 · Validación

### Caso 1 · Prueba real en producción — NO PASÓ
- **Input:** JC entró a https://money-maker-tawny.vercel.app con su cuenta, después de publicar el PR #65, y buscó a Billy.
- **Output (palabras de JC):** "No veo el chatbot."
- **Veredicto de JC: RECHAZAR.** "Me acabo de meter al link que me enviaste y no hay nada diferente."
- **Causa (la encontró la IA después del reporte):** la tarjeta de Billy solo se muestra cuando la cuenta ya tiene
  movimientos, y la cuenta de JC no tenía ninguno. Billy sí responde en `/app/billy`, pero no había cómo llegar.
- **Contra la especificación:** el campo 1 dice que el usuario pregunta y recibe respuesta. Si no puede encontrar dónde
  preguntar, la función no cumple, aunque el cálculo esté bien.
- **Estado:** corrección en curso (Billy visible siempre).

### Caso 2 · Prueba real en producción — NO PASÓ
- **Input:** JC subió un archivo para tener datos con los que Billy pudiera contestar.
- **Output (palabras de JC):** "traté de subir un estado de cuenta y no sirvió."
- **Diagnóstico, output literal de `/api/health?modelo=1`:**
  `"lectura":{"ok":false,"detalle":"401 ... authentication_error ... invalid x-api-key"}`
- **Qué significa:** la llave del servicio que lee los documentos ya no es válida. No es un error de la función;
  es una dependencia externa caída. Sin datos, Billy solo puede contestar "Todavía no tengo movimientos tuyos".
- **Estado:** pendiente de que JC cambie la llave.

### Caso 3 · Prueba automática de la lógica — PASA
Se ejecuta en cada cambio (GitHub Actions). Archivo: `src/lib/domain/telegram.test.ts`.
- **Input:** presupuesto de la quincena de $9,000, gastado $6,150, 4 días restantes; suscripciones Netflix $249 y
  Spotify $129; pregunta "¿Cuánto me queda?".
- **Output:** "Te quedan $2,850 para 4 días: llevas $6,150 de $9,000. Son $713 por día."
- **Segunda comprobación:** un texto que dice "Te quedan $3,000" se detecta como cifra inventada y se descarta.
- **Qué demuestra y qué no:** que el cálculo y el filtro de cifras hacen lo que dice la especificación. No demuestra
  que un usuario real pueda usar la función; eso lo mostraron los casos 1 y 2.

### Veredicto general
La lógica de Billy cumple los campos 2 y 3 en pruebas automáticas. En producción, con un usuario real, la función
**todavía no cumple el campo 1**: JC no pudo encontrarla y no pudo cargar datos para probarla. Falta un caso real
con datos en el que se compare la respuesta de Billy contra Presupuesto.

---

## Estado de la aplicación al entregar

| Parte | Estado |
|---|---|
| Portada, crear cuenta, entrar con contraseña | Publicado; pasa las pruebas de navegador |
| Billy (`/app/billy`) | Responde; con cifras reales solo si la cuenta tiene movimientos |
| Subir estado de cuenta | No funciona: llave del servicio de lectura inválida |
| Presupuesto, Gastos, Suscripciones, Inversiones | Publicado; pasan las pruebas de navegador con datos de ejemplo |
| Billy en Telegram | Publicado, sin probar con un mensaje real |

---

## Uso de IA

- **Herramientas:** Claude (modelo Fable 5.2) en una sesión conectada al repositorio, a Supabase y a Vercel; y Claude Code.
- **Qué hizo la IA:** escribió todo el código de la función, sus pruebas y las migraciones; diagnosticó las fallas con
  los registros; abrió los PR; y armó esta bitácora ordenando los mensajes literales de JC.
- **Qué hizo JC:** propuso la función; la eligió contra la recomendación de la IA; probó cada versión en producción;
  rechazó o pidió revisar cinco propuestas (entradas 1, 2, 3, 5 y 6); detectó un error que la IA no señaló (entrada 4);
  y publicó cada cambio.
- **Qué se verificó y qué no:** JC verificó en producción el acceso, la ubicación del bot y la subida de archivos.
  No revisó las decisiones técnicas de la entrada 8, y todavía no se compara la cifra de Billy contra Presupuesto con
  datos reales.
- **Límite que puso la IA:** JC pidió que la IA hiciera el trabajo sola y que el documento dijera que todo está
  completo. La IA no escribió razones que JC no dio ni reportó como funcionando lo que no funciona.
