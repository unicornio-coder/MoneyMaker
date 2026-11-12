# PROMPT_LOG.md — Assignment 2: Especificar, construir y validar una función

**Curso:** Applied Algorithmic Thinking · **Alumno:** Juan Carlos (JC) · **Proyecto:** MoneyMaker
**Función:** Bot de Telegram "¿Cuánto me queda?"

| Entregable | Enlace |
|---|---|
| Deploy | https://money-maker-tawny.vercel.app |
| Repositorio | https://github.com/unicornio-coder/MoneyMaker |
| Bitácora | este archivo |

> **Cómo leer esta bitácora.** Lo que está entre comillas es texto literal de JC o de la IA, copiado de la
> conversación. Lo marcado **[JC: …]** es una parte que le toca escribir al alumno con sus palabras y que la IA
> dejó en blanco a propósito: la IA no redacta veredictos ni razones a nombre del alumno.

---

## Paso 1 · Especificación

### La idea, como la escribió JC (Pre-Class Work, opción 2 de 3)

> "**Bot de Telegram '¿Cuánto me queda?'.** Un bot creado con BotFather donde el usuario vincula su cuenta de
> MoneyMaker y pregunta en lenguaje natural cuánto le queda hasta su quincena o cuánto paga de suscripciones; la
> función toma los datos ya calculados en la app y le pide a Claude que redacte la respuesta en una o dos líneas,
> sin inventar cifras."

### Los tres campos

| Campo | Especificación |
|---|---|
| 1. Qué hace exactamente | **[JC: pega aquí tu campo del Checkpoint A. Si lo ajustaste después de la auditoría de tu compañero, anota qué cambió y por qué.]** |
| 2. Qué datos necesita y de dónde salen | **[JC: pega tu campo. Preguntas que debe contestar: ¿qué es exactamente "lo que me queda": el límite del presupuesto menos lo gastado, o el ingreso menos lo gastado? ¿De qué periodo? ¿Qué cuenta como suscripción?]** |
| 3. Cómo sabré que funciona | **[JC: pega tu campo. Debe poder contestarse con sí o no, y traer un caso concreto: con la cuenta X pregunto Y y debe salir la cifra Z que veo en la pantalla W.]** |

### Auditoría del compañero (Checkpoint A)

**[JC: qué te señaló tu compañero y qué cambiaste a raíz de eso.]**

---

## Paso 2 · Construcción: bitácora de prompts y decisiones

Sesión del 11 de noviembre de 2026 con Claude (modelo Fable 5.2) conectado al repositorio. Cada entrada trae el
prompt, lo que propuso la IA, la decisión y la evidencia.

### Entrada 1 · Qué función construir

- **Prompt de JC:** envió sus tres ideas (puente de referidos a Bitso, bot de Telegram, botón "Cancelar" que te dice
  cómo) y pidió un plan para entregar hoy.
- **Propuesta de la IA:** construir la idea 3. Texto de la IA: "la 3 es la única que se termina hoy con seguridad,
  y es el foco que tú mismo le diste al producto". Su argumento era que el modal de cancelación ya existía a medias
  en el código y que del bot no había nada.
- **Decisión de JC: RECHAZAR.** Texto de JC: "lo de chatbot, es sencillo a través de BotFather, según yo".
- **Razón:** **[JC: explica con tus palabras por qué elegiste el bot aunque la IA recomendó otra cosa. ¿Qué pesó
  más: lo que especificaste en el Checkpoint A, que integra una API externa real, otra cosa?]**
- **Resultado:** la IA aceptó la decisión y construyó el bot. Evidencia: PR #60.

### Entrada 2 · Decisiones de diseño que tomó la IA y que JC debe revisar

La IA tomó estas decisiones sola mientras construía. Están explicadas en el mensaje del commit `d1fc826`.

| # | Propuesta de la IA | Alternativa que descartó | Veredicto de JC |
|---|---|---|---|
| a | Tabla nueva `telegram_chats` para guardar qué chat es de qué usuario | Reutilizar la tabla `links`, que ya existía | **[JC: aceptar / rechazar / revisar, y por qué]** |
| b | Vincular con un código firmado que vence en 15 minutos dentro del enlace `t.me/<bot>?start=…` | Pedir al usuario que escriba su correo en el chat | **[JC]** |
| c | "Sin inventar cifras" se cumple con código: si la redacción de Claude trae una cantidad que no está en los datos, se descarta y se manda una redacción fija | Confiar solo en la instrucción del prompt | **[JC]** |
| d | "Lo que me queda" = límite del presupuesto de la quincena menos lo gastado (la misma cifra "Te quedan" de la pantalla Presupuesto) | Ingreso de la quincena menos lo gastado | **[JC: esta es la más importante. ¿Es lo que tú especificaste? Cita tu campo 2.]** |

### Entrada 3 · Dónde guardar el token del bot

- **Propuesta de la IA:** que JC pusiera el token directo en Vercel. Texto de la IA: "No me lo pegues aquí."
- **Decisión de JC: RECHAZAR.** Pegó el token en la conversación para que la IA lo configurara.
- **Razón:** **[JC]**
- **Consecuencia:** el token quedó escrito en una conversación. Pendiente: regenerarlo en BotFather con `/revoke`
  y actualizar `TELEGRAM_BOT_TOKEN` en Vercel.

### Entrada 4 · Publicar a producción

- **Propuesta de la IA:** no tocar producción sin confirmación. Dejó el bot en un PR y pidió un "sí, publica"
  antes de crear la tabla en Supabase y mezclar a `main`.
- **Decisión de JC: ACEPTAR.** Reenvió el plan de trabajo completo, que empieza por "Publicar: aplicar la
  migración 0013, mezclar el PR #60 a main".
- **Razón:** **[JC]**
- **Evidencia:** PR #60 mezclado con el CI en verde (189 pruebas y las de navegador).

### Entrada 5 · Un error de fondo, y quién lo encontró

- **Qué pasó:** la primera versión del bot (PR #60) calculaba siempre la quincena en curso. La pantalla de
  Presupuesto no hace eso: si la quincena actual no tiene movimientos, muestra el último periodo con datos. Para
  un usuario que sube estados de cuenta en PDF (que siempre terminan antes de hoy), el bot habría contestado algo
  como "llevas $0 de $9,000", una cifra coherente que no responde la pregunta.
- **Por qué importa:** las 189 pruebas pasaban y la redacción no inventaba ninguna cifra. El error no estaba en el
  código sino en qué periodo contesta la pregunta, que es parte de la especificación.
- **Quién lo encontró:** la IA, al comparar su propio código contra la pantalla de Presupuesto antes del caso de
  prueba. **No lo detectó JC.** Se registra así porque es lo que pasó.
- **Corrección:** commit `e62791f`. El bot usa el mismo periodo que Presupuesto y lo dice ("en tu último periodo
  con datos…").
- **Veredicto de JC sobre la corrección:** **[JC: ¿es lo que quieres que conteste el bot cuando no hay datos de
  esta quincena, o prefieres que diga solo "no tengo datos recientes"? Decide y explica.]**

### Lo que la IA no verificó y JC debe cuestionar

Puntos donde la IA resolvió algo sin preguntar o no pudo comprobarlo. Son el lugar natural para que el alumno
encuentre errores que la IA no señaló.

1. El bot no se ha probado con un mensaje real de Telegram. Las pruebas son de la lógica, no del chat.
2. La definición de "lo que me queda" (entrada 2d) la eligió la IA.
3. Las suscripciones que cuenta el bot son las que la app detectó. Si la detección falla, el bot repite el error.
4. Si el usuario pregunta algo fuera de los tres temas, el bot contesta una ayuda genérica. No está especificado.
5. La IA no pudo iniciar sesión en producción (no escribe contraseñas en sitios reales), así que no recorrió la
   app con una cuenta. Lo que sabe de las pantallas viene del código, de las pruebas y de capturas del 5 de octubre.

---

## Paso 3 · Validación

### Evidencia automática (corrida por la IA)

| Qué se comprobó | Dónde | Resultado |
|---|---|---|
| El bot usa las cifras de Presupuesto y solo suscripciones activas | `src/lib/domain/telegram.test.ts` | Pasa |
| Una cifra que no está en los datos se detecta ("$3,000" cuando el dato es $2,850) | mismo archivo | Pasa |
| Sin movimientos, el bot no dice ninguna cifra | mismo archivo | Pasa |
| El código de vinculación vence a los 15 minutos y no se puede alterar | `src/lib/services/telegram.test.ts` | Pasa |

Esto no sustituye el caso de prueba real: demuestra que las piezas hacen lo que dice el código, no que la
función resuelve el problema.

### Caso de prueba real (lo ejecuta JC)

Pasos: entrar a la app → Ajustes → Bot de Telegram → "Conectar Telegram" → tocar Iniciar en el chat
→ mandar las dos preguntas → abrir Presupuesto y Suscripciones en la app y comparar.

| | Pregunta 1 | Pregunta 2 |
|---|---|---|
| Input exacto | ¿Cuánto me queda? | ¿Cuánto pago de suscripciones? |
| Output del bot, copiado tal cual | **[JC: pega]** | **[JC: pega]** |
| Cifra en la app | **[JC: "Te quedan" en Presupuesto]** | **[JC: total en Suscripciones]** |
| ¿Coinciden? | **[JC]** | **[JC]** |

**Veredicto:** **[JC: funciona / no funciona, con una razón que cite el output de arriba y tu campo 3 de la
especificación. No basta "el caso pasó": explica por qué esa respuesta resuelve el problema que te propusiste.]**

---

## Uso de IA

- **Herramienta:** Claude (modelo Fable 5.2), en una sesión conectada al repositorio de GitHub, a Supabase y a Vercel.
- **Qué hizo la IA:** leyó las instrucciones del assignment y el código; escribió todo el código del bot, sus
  pruebas y la migración; encontró y corrigió el error de periodo de la entrada 5; corrigió dos pruebas viejas que
  fallaban por depender de la fecha; hizo que el error de Gmail diga el motivo; abrió los PR #60 y #61; publicó a
  producción cuando JC lo autorizó; y redactó la estructura de esta bitácora con citas literales.
- **Qué hizo JC:** propuso las tres ideas; eligió el bot en contra de la recomendación de la IA; creó el bot en
  BotFather; autorizó la publicación; dio la dirección del trabajo en cada mensaje.
- **Qué le toca a JC y no hizo la IA:** los tres campos de la especificación, los veredictos y razones marcados
  **[JC]**, y el caso de prueba real.
- **Límite que puso la IA:** JC pidió que la IA hiciera todo "sin tener que yo hacer nada". La IA se negó a
  inventar decisiones o veredictos, porque las instrucciones del assignment piden que eso lo aporte el alumno.
