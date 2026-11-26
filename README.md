# MoneyMaker

Finanzas personales para México: subes el estado de cuenta que tu banco ya te manda (PDF, Excel, CSV o Word) y la app encuentra tus suscripciones, ordena tus gastos, arma tu presupuesto por quincena y te deja preguntarle a Billy cuánto te queda. Web y móvil (PWA), un solo código. Hoy es gratis; no pide claves del banco.

- **App:** <https://money-maker-tawny.vercel.app>
- **Proyecto del curso Applied Algorithmic Thinking.** Bitácora del Assignment 2: [`PROMPT_LOG.md`](PROMPT_LOG.md).
- Cómo se opera en producción: [`docs/OPERACION.md`](docs/OPERACION.md). Tablero de trabajo: [`qa/TABLERO.md`](qa/TABLERO.md). Reglas para el asistente de código: [`CLAUDE.md`](CLAUDE.md).

## Probar la app en 3 minutos

1. Abre la app, toca **Empezar** y escribe correo y contraseña. Si el correo es nuevo te pide tu nombre y crea la cuenta ahí mismo (no hay que confirmar el correo).
2. En el paso "Sube tu estado de cuenta", toca **Cuenta de nómina** o **Tarjeta de crédito**: la app trae ese estado de cuenta de ejemplo y lo empieza a leer, sin descargar nada. Son documentos de prueba, no de un banco real; también están en [`public/ejemplos/`](public/ejemplos/) por si quieres subirlos a mano. Los mismos dos botones están en Inicio y en Importar.
3. Revisa lo que se leyó y guarda. Inicio, Gastos, Suscripciones, Presupuesto y Billy se llenan con esas cifras.

Funciones para probar de principio a fin:

| Función | Dónde | Qué debe pasar |
|---|---|---|
| Leer un estado de cuenta | Importar | Banco, periodo y movimientos listos para revisar; al guardar se llenan Inicio, Gastos, Suscripciones y Presupuesto. Los ejemplos son de mediados de 2026, así que las pantallas dicen "Último periodo con datos". |
| Billy | Menú → Billy | Contesta "¿cuánto me queda?", "¿cuánto pago de suscripciones?" y "¿qué cobros vienen?" con las mismas cifras de Presupuesto y Suscripciones. Nunca dice una cifra que la app no calculó. |

## Decisiones de diseño vs. sugerencias del IS

"IS" es el sistema inteligente con el que se construyó la app (Claude, en Claude Code y en sesiones conectadas al repositorio). Cada entrada dice qué propuso, qué decidió JC y por qué. **Las frases entre comillas son mensajes literales de JC, con su ortografía original;** el resto es registro de lo que pasó, ordenado por la IA. Donde un hallazgo fue de la IA y no de JC, se dice.

### 1. Diseño · Entrar y crear cuenta en una sola pantalla (noviembre)
- **Propuesta del IS:** dos pantallas separadas, `/login` y `/registro`.
- **Decisión de JC:** revisar. Una sola pantalla con pestañas y un botón para volver a la portada.
- **Motivo:** "Es muy importante que el flujo de crear cuenta o entrar que esté en el mismo, porque está separado y son dos pantallas." Y: "si yo me quiero regresar del registro [...] no hay botón para ir, entonces me quedo atorado en esa misma pantalla."
- **Verificación:** JC lo probó en producción. Evidencia: PR #64.

### 2. Funcionalidad · Qué función real construir (Assignment 2)
- **Propuesta del IS:** el botón "Cancelar", porque era "la única que se termina hoy con seguridad".
- **Decisión de JC:** rechazar. Se construyó el asistente "¿Cuánto me queda?".
- **Motivo:** "lo de chatbot , es senicllo a traves de botfather , segun yo".
- **Evidencia:** PR #60, commit `d1fc826`.

### 3. Funcionalidad · Billy vive dentro de la app, no en Telegram
- **Propuesta del IS:** la tarjeta de Inicio mandaba a conectar Telegram para usar el bot.
- **Decisión de JC:** rechazar, aunque cambiaba la especificación original.
- **Motivo:** "Me está mandando Telegram. Eso está mal. Necesito que el chatbot esté dentro de la aplicación. Que se inicie solo y que conteste solo. Quiero ver si eso es posible y rápido. Y si no, quítalo."
- **Evidencia:** PR #65. Telegram quedó como canal opcional.

### 4. Despliegue · El acceso por enlace no servía en producción
- **Propuesta del IS (septiembre):** entrar con un enlace enviado por correo, sin contraseña.
- **Decisión de JC:** rechazar y cambiar a correo y contraseña.
- **Motivo:** "Actualmente nos manda un mail a mi cuenta para entrar y no me deja entrar."
- **Verificación:** la IA revisó los registros de Supabase y confirmó la falla que JC reportó: el enlace se canjeaba desde una IP de Google segundos después de enviarse, antes de que él lo abriera. Evidencia: PR #63.

### 5. Despliegue · Un error que detectó JC y el IS no señaló
- **Lo que entregó el IS:** el bot se conectaba desde el fondo de Ajustes. Las pruebas pasaban y lo reportó como terminado.
- **Lo que encontró JC al probar en producción:** "no encuentro el chatbot que quedamos poner en aquí mismo con Telegram." Después, con Billy ya publicado: "Me acabo de meter al link que me enviaste y no hay nada diferente."
- **Por qué importa:** el código funcionaba, pero un usuario real no podía llegar a la función. Ninguna prueba automática lo veía.
- **Evidencia:** commit `b71bb31` y PR #69 (Billy siempre visible). Detalle en [`PROMPT_LOG.md`](PROMPT_LOG.md), entrada 4 y caso 1.

### 6. Escalabilidad · Quién lee cada estado de cuenta, y cuándo se paga la IA (19 de noviembre)
- **Diagnóstico (Sesión 22, 17-nov):** con 5 usuarios, 8 estados de cuenta y 13 MB de base, lo único que crece con cada usuario es el costo de la IA que lee los archivos: 10,727 tokens de entrada y 7,202 de salida por PDF en promedio.
- **Lo que salió al verificar el diagnóstico (hallazgo de la IA, no de JC):** el cálculo usó el precio de Claude Sonnet 5.5 ($2 y $10 USD por millón de tokens), pero el código tenía por defecto el modelo más caro, que el IS había elegido en septiembre sin que nadie lo decidiera. Con el precio de Opus 5 ($5 y $25) cada PDF cuesta $0.234 USD y no $0.094, y el tope de gasto de $500 USD al mes se alcanza cerca de los 1,070 usuarios y no de los 2,670.
- **Propuesta del IS:** cuatro opciones; tres eran topes (archivos por usuario al mes, tope de gasto global, modelo barato solo para ciertos archivos).
- **Decisión de JC:** no eligió ninguna y puso el criterio: "dime una idea innovadora que no sea limitante para el liente y ni cara para mi".
- **Qué se hizo distinto:** lectura escalonada. Cada archivo empieza por el lector más barato y sube solo cuando la app puede comprobar que no bastó: reglas sin costo, aceptadas únicamente si la suma de movimientos cuadra con los totales que imprime el banco; después el modelo económico (Claude Haiku 5.5, unos $0.005 USD por PDF); y el modelo fuerte solo si el económico no cuadra. El cliente no ve ningún tope. Aparte queda un tope de 20 archivos por usuario en 24 horas, contado en la base de datos, que es contra abuso y no contra uso normal (hoy el promedio es de 2 al mes).
- **Verificación:** 7 pruebas de la escalera con lectores simulados y los 3 estados de ejemplo, que se leen completos con reglas y cuadran. **No está probado contra la API real:** la llave de producción está inválida desde noviembre. Hasta que se cambie, los archivos que las reglas no entienden no se pueden leer.
- **Evidencia:** [`src/lib/services/ingestion/escalera.ts`](src/lib/services/ingestion/escalera.ts) y su prueba; PR #76. Precios consultados el 19-nov-2026 en <https://platform.claude.com/docs/en/about-claude/pricing>; límites en <https://supabase.com/pricing> y <https://vercel.com/docs/plans/hobby>. JC abrió él mismo la página de Supabase el 17-nov y confirmó los 500 MB del plan gratis.

### 7. Seguridad · Instrucciones escondidas y lo que encontró la auditoría (19 de noviembre)
- **Origen:** el caso de clase de Ahorra+ (un mensaje con una "nueva instrucción del sistema" escondida en una reseña). JC pidió revisar si su proyecto tenía el mismo problema: "si mi proyecto tiene mi mismo problema, analízalo".
- **Lo que se encontró (hallazgo de la IA):** ninguno de los cinco prompts de sistema, todos escritos por el IS, decía qué hacer con instrucciones que llegaran dentro de la pregunta, del documento o del correo. El filtro de Billy solo revisaba cifras, no texto.
- **Por qué el daño posible era menor que en el caso de clase:** el prompt de Billy no guarda datos de otra persona ni decide quién puede verlos; la identidad la comprueba el código con la sesión, y el modelo solo recibe las cifras de quien pregunta.
- **Decisión de JC:** corregirlo: "si debo meterle alg a money maer hazlo".
- **Qué se hizo:** regla común en los cinco prompts (el contenido son datos, nunca instrucciones), datos y pregunta en bloques separados que el texto del usuario no puede cerrar, y un detector que contesta con la respuesta fija y deja registro cuando la pregunta parece un intento de cambiarle las reglas. Después, una auditoría del resto de la app encontró y se cerraron: que un usuario podía escribir su propio plan desde el perfil, una redirección abierta en `/login?next=`, lecturas con IA sin límite desde las notificaciones del teléfono y la falta de cabeceras de seguridad.
- **Verificación:** pruebas con el mismo mensaje del caso de clase. No se probó el ataque contra el modelo real.
- **Evidencia:** PR #74 y PR #76 (commits "seguridad: …").

### 8. Despliegue · El primer día con datos reales: dos fallas que encontró JC (17 y 18 de septiembre)
- **Lo que entregó el IS:** la app completa, probada en modo demo, con datos en memoria. La dio por funcionando: pasaban las 47 pruebas y las capturas de todas las pantallas se veían bien.
- **Lo que encontró JC al entrar con su cuenta real:** primero un error de servidor al abrir el onboarding: "me sale esto" (con la captura). Ya corregido eso, la lista de bancos salía vacía: "mira no me salen bancos". Al día siguiente, con la lista visible, el botón no hacía nada: "mira sale peor le pico y no sale nadas , ncesito que si funcione , has el flujo para que funicone".
- **Causa (la encontró la IA después de cada reporte):** el modo demo escondía las dos fallas. El perfil se guardaba con un `upsert`, que Postgres valida como inserción completa, y exigía el correo aunque el perfil ya existiera. La lista de bancos venía de Belvo y el código tenía `.catch(() => [])`: si Belvo fallaba, la pantalla quedaba vacía sin decir por qué, y el botón abría el widget sin mostrar ningún estado ni error.
- **Decisión de JC:** no dar la conexión por buena hasta verla funcionar él mismo en producción.
- **Qué se hizo distinto:** el perfil se actualiza solo con lo que cambió (commit `22568d2`); la lista de bancos tiene un catálogo de respaldo y el error queda en el registro (`87ec9a6`); la conexión muestra cada paso y el motivo real de cualquier falla (`b63cae1`). En noviembre JC quitó la conexión bancaria de la app (bitácora, entrada 6), así que hoy la única fuente es el estado de cuenta.
- **Por qué importa:** es el mismo patrón que la entrada 5, dos meses antes: el código pasaba las pruebas, pero un usuario real no podía usarlo. Ninguna prueba automática corría contra la base de datos real.

### 9. Funcionalidad · Cancelar una suscripción: enlace directo, sin cartas (26 de noviembre)
- **Propuesta del IS:** que la app armara una carta de cancelación con los datos del usuario y la mandara por correo al proveedor (Netflix, Spotify…), además de un botón para "negociar la tarifa".
- **Decisión de JC:** rechazar. "No le podemos mandar carta. Eso quítalo." Que la app solo lleve al usuario a la página donde se cancela.
- **Qué se hizo:** el modal muestra el enlace de cancelación de cada proveedor (o su sitio si no lo conocemos), lo deja copiar, explica los pasos y avisa del truco de retención. La app no manda nada en nombre del usuario. Se quitaron la carta en PDF, el formulario y "Negociar mi tarifa". Commit `77ba269`.
- **Por qué importa (registro de la IA):** con la carta, la app hablaba a nombre del usuario con un tercero y le pedía sus datos para hacerlo. Sin ella, la app no manda correos ni escribe a nadie a nombre del usuario.

### 10. Seguridad · Crear cuenta sin correo de confirmación (26 de noviembre)
- **Propuesta del IS (anterior):** confirmar cada cuenta nueva con un enlace por correo, que es la práctica estándar para comprobar que el correo es de quien lo escribe.
- **Decisión de JC:** revisar. Un solo botón "Empezar" que pide correo y contraseña: "si ya tiene clave y contraseña [...] puedes entrar solito, y si no, inicia sesión rápido [...] y ya no que manden un mail. Que manden un mail únicamente si quieren recuperar contraseña."
- **Qué se hizo:** si el correo ya tiene cuenta y la contraseña es correcta, entra; si la contraseña no coincide, lo dice y ofrece recuperarla; si el correo es nuevo, pide nombre y crea la cuenta ya confirmada en el mismo paso. El correo solo se usa para recuperar la contraseña.
- **Riesgo que se acepta:** alguien puede abrir una cuenta con un correo que no es suyo. Lo que se mantiene: contraseña de 8 caracteres o más, límite de intentos por IP, y cada usuario solo ve sus datos (RLS). Está en "Lo que hoy no funciona o no está comprobado".

### 11. Diseño · Solo modo día y una portada que promete un resultado (26 de noviembre)
- **Propuesta del IS:** modo oscuro automático según el sistema, con interruptor; y una portada con el título "Sube tu estado de cuenta. Ve qué te sobra.", una píldora "Para quien cobra por quincena en México" y un campo de correo.
- **Decisión de JC:** revisar las dos. "Quita el modo nocturno, solo me gusta el modo de día." En la portada, "Sube tu estado de cuenta, ve qué te sobra" se queda "pero no como la principal. En la principal pon todo tu dinero en un solo lugar y ganar más". Quitar la píldora y cambiar "Ir a mi panel" por "Empezar".
- **Qué se hizo:** título "Todo tu dinero en un solo lugar. Para que ganes más.", la frase anterior como subtítulo y un solo botón "Empezar" que lleva al acceso (commit `b2e6244`). Sin modo oscuro: aunque el teléfono esté en oscuro, la app se ve en claro, y una prueba de accesibilidad lo comprueba (`0efa65d`).

## Lo que hoy no funciona o no está comprobado

- **Lectura con IA en producción:** la llave del servicio está inválida. Los archivos con texto legible que cuadran se leen con reglas; un PDF escaneado no se puede leer.
- **Ningún PDF real de banco está en las pruebas.** Los ejemplos son documentos sintéticos; lo demás depende de la lectura con IA.
- **Registro abierto:** cualquiera puede crear una cuenta sin confirmar el correo (decisión de JC, entrada 10).
- **Textos legales:** los términos y el aviso de privacidad ya describen la app de hoy (gratis, por estados de cuenta, y qué se envía al servicio de IA), pero siguen siendo borradores sin revisión de un abogado y falta el domicilio del responsable.
- **Límites por petición:** el límite de preguntas a Billy vive en memoria por instancia; en Vercel no es un control firme.

## Uso de IA

- **Herramientas:** Claude (Claude Code y sesiones de Claude conectadas al repositorio, a Supabase y a Vercel).
- **Qué hizo la IA:** escribió el código, las pruebas y las migraciones; corrió tres auditorías el 19 de noviembre (seguridad, uso de principio a fin y verificación de precios contra las páginas oficiales); abrió los PR; y ordenó este README y la bitácora a partir de los mensajes de JC.
- **Qué hizo JC:** definió el producto y a quién va dirigido; eligió qué construir, varias veces contra la recomendación de la IA (entradas 1 a 4); probó cada versión en producción y detectó fallas que las pruebas no veían (entrada 5); hizo el diagnóstico de escalabilidad de la Sesión 22 con los números de sus tableros; puso el criterio de la decisión de escalabilidad (entrada 6); y decide qué se publica.
- **Qué no se verificó:** la lectura con IA contra el servicio real (la llave de producción está inválida), y las decisiones técnicas internas que JC aceptó sin revisar (están listadas en la entrada 8 de la bitácora).
- **Regla que se siguió al escribir:** la IA no redactó motivos que JC no dio. Lo que va entre comillas es literal.

## Historial de commits

Hasta septiembre hay commits con mensajes cortos generados por el asistente de código ("Fase 4", "fix"); no se reescribieron. La decisión detrás de cada bloque está en [`qa/TABLERO.md`](qa/TABLERO.md) (entrada por fecha) y en la bitácora. Desde noviembre cada mensaje dice qué se decidió y por qué.

## Correr en local (modo demo, sin llaves)

```bash
npm install
npm run dev
```

Abre <http://localhost:3000/app>. Sin variables de entorno la app corre en **modo demo**: un usuario con cuentas simuladas que pasan por el mismo pipeline que un usuario real. Los datos viven en memoria. Para empezar vacío: `MOCK_SIN_DEMO=true npm run dev` y sube los PDFs de `qa/entregables/estados/`.

Comandos: `npm run build` · `npm run typecheck` · `npm run lint` · `npm test` (unitarias) · `npm run test:e2e` (Playwright, móvil y escritorio; en CI corre contra `next build` + `next start`).

## Modo real

1. **Supabase**: proyecto nuevo, corre las migraciones de `supabase/migrations/` en orden, Authentication → URL Configuration con `https://<dominio>/auth/callback`. Copia `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY`; pon `NEXT_PUBLIC_USE_MOCK=false`.
2. **Vercel**: importa el repo, rama de producción `main`, agrega las variables de `.env.example` que tengas. Un PR a `main` con la etiqueta `publicar` y el CI en verde publica solo.
3. Cada integración se enciende con sus variables y `/api/health` dice cuáles están activas: Belvo (bancos), Resend (correos), Stripe (cobro), VAPID (push), Google/Microsoft (alertas del correo), Anthropic (lectura de PDF difíciles), token de GitHub (reportes → issues).

## Estructura

```
src/app            rutas (App Router): /app/*, /login, /registro, /onboarding, /api/*
src/components     UI por dominio (inicio, gastos, fijos, presupuesto, ayuda, planes, …)
src/lib/domain     lógica pura con tests: quincena, categorizar, recurrentes, presupuesto, plan, resumen, carta
src/lib/services   integraciones: aggregator (Belvo/mock), ingestion, correo, push, stripe, gmail, outlook
src/lib/server     rate limit, registro de errores, segundo plano
src/lib/data       repositorio (memoria y Supabase), contexto de sesión, siembra demo
supabase           migraciones
apps/android       app que reenvía notificaciones bancarias (Kotlin)
```

Cómo fluye un dato: cualquier fuente (Belvo, PDF, correo, notificación del teléfono, manual) produce movimientos crudos → `services/ingest.ts` categoriza, deduplica y guarda → `domain/recurrentes.ts` detecta suscripciones, servicios y MSI → `domain/insights.ts` genera avisos. Las pantallas solo leen del repositorio. El PDF y su contraseña nunca se guardan. Todas las tablas de usuario tienen RLS.
