# Estrategia de datos: conectar cada movimiento, darle detalle y cancelar lo que sobra

Hoy el producto lee estados de cuenta en PDF. Eso es la entrada, no el valor. El valor está en tres cosas que nadie hace bien en México: (1) tener **todos** los movimientos sin que el usuario haga nada, (2) que cada cargo diga **qué fue** (no "AMAZON MX", sino "Secadora Remington, 1 de 6 MSI") y (3) **cancelar** en dos toques lo que sobra. Este documento dice cómo lo haría yo, en orden, con lo que existe y lo que hay que construir.

## 1. Conectar todos los movimientos (sin fricción)

No hay una sola fuente que cubra todo en México. La estrategia es **apilar fuentes** detrás de la misma interfaz `TransactionSource` (ya existe en `src/lib/services/ingestion/`), deduplicar por hash y dejar que cada usuario tenga las que le convengan. De más fácil a más completa:

| # | Fuente | Cobertura | Fricción | Latencia | Estado |
|---|---|---|---|---|---|
| 1 | **PDF del estado de cuenta** | Todos los bancos | Baja (un archivo al mes) | Mensual | Hecho |
| 2 | **Correo de alertas y recibos** (Gmail/Outlook con OAuth solo lectura, o una dirección `tu-id@in.moneymaker.mx` a la que reenvías) | BBVA, Banorte, Santander, HSBC, Amex, Nu, Klar, Stori mandan alerta por cada cargo; Amazon, Uber, Rappi, DiDi, Mercado Libre mandan recibo | Media (un permiso una vez) | Minutos | Parcial (`gmail.parsers.ts` lee alertas; faltan recibos) |
| 3 | **Notificaciones del teléfono** (Android: `NotificationListenerService`; una app nativa mínima o Capacitor) | Cualquier app bancaria que notifique cargos: BBVA, Nu, Banorte, Santander, Hey, Klar, Stori, Mercado Pago | Media (activar un permiso) | Segundos | Por hacer. iOS no lo permite: ahí la vía es el correo. |
| 4 | **Agregadores bancarios** (Belvo, Finerio Connect, Prometeo, Syncfy) | Bancos grandes vía credenciales; a veces se rompen | Alta (dar usuario y contraseña del banco a un tercero; muchos usuarios no quieren) | Horas | Belvo integrado en sandbox; desactivado en la hoja de "Agregar cuenta" |
| 5 | **SMS bancarios** (Android) | Bancos que aún avisan por SMS | Media | Segundos | Por hacer (mismo camino que 3) |
| 6 | **Captura manual** | Efectivo | Alta | Inmediata | Hecho |
| 7 | **Open banking regulado (CNBV)** | Todos | Nula | Tiempo real | No existe en producción para personas físicas; vigilar |

**Cómo lo haría, en orden:**

1. **Semana 1–2: correo.** Es la fuente más rica y ya tenemos el conector. Ampliar `gmail.parsers.ts` con: alertas de cargo de los 8 bancos principales (monto, últimos 4, comercio, fecha), y recibos de **Amazon, Uber, DiDi, Rappi, Mercado Libre, Netflix, Spotify, Apple, Google**. Añadir **Outlook/Hotmail** (Microsoft Graph) y una **dirección de reenvío** por usuario para quien no quiera dar OAuth. El correo llega minutos después del cargo: el usuario ve el movimiento **antes** de que aparezca en el estado de cuenta.
2. **Semana 3–4: notificaciones en Android.** Una app mínima (Capacitor sobre la PWA actual) con `NotificationListenerService` que manda a `/api/notificaciones` el texto de las notificaciones de apps bancarias (lista blanca de paquetes: `com.bbva.mx`, `com.nu.production`, `com.banorte.movil`, `mx.santander`, `com.hey.banco`, `mx.klar`, `com.storicard`, `com.mercadopago.wallet`). El parser es el mismo que el de correo. Con esto se cubre el 80 % de los cargos con tarjeta al instante y sin claves.
3. **Después: agregador como opción "avanzada".** Belvo/Finerio para quien lo quiera, con el aviso claro de que comparte credenciales. Nunca como el camino principal.

**Reglas que hacen que esto funcione:** cada fuente escribe `MovimientoCrudo` con `fuente` y `externalId`; `dedupe.ts` casa lo mismo visto por dos fuentes (misma cuenta, monto, ±2 días, descripción parecida) y conserva el más rico. Un cargo visto por notificación hoy y por PDF en 30 días es **un** movimiento.

## 2. Detalle de cada cargo (lo que nadie da)

El banco solo tiene el descriptor. El detalle está en el **recibo** que el comercio manda por correo. Casar los dos es el producto.

**Pipeline de enriquecimiento** (`src/lib/services/enriquecer.ts`, por hacer):

1. **Ingesta de recibos** por correo (fuente 2). Parsers por comercio, con texto primero y modelo como respaldo:
   - **Amazon.com.mx**: asunto "Tu pedido de …" / "Enviado: …". Extrae artículos, cantidad, total, si fue a meses (MSI) y fecha de entrega. Un pedido puede partirse en varios cargos: se casa por total o por suma de envíos.
   - **Uber / DiDi**: recibo con origen, destino, hora, distancia, total. Detalle: "Roma Norte → Polanco · 22 min".
   - **Rappi / Uber Eats / DiDi Food**: restaurante y artículos.
   - **Mercado Libre**: artículo, vendedor, fecha de entrega, MSI.
   - **Netflix / Spotify / Apple / Google / Microsoft**: plan y periodo; sirve además para confirmar suscripciones.
   - **CFE, Telmex, Totalplay, Izzi, Telcel**: recibo con periodo y consumo.
2. **Casamiento recibo ↔ movimiento**: misma tarjeta (últimos 4 si el recibo los trae), monto igual (o suma de partes), fecha ±3 días, comercio compatible. Puntuación; por encima de 0.8 se une solo, entre 0.5 y 0.8 se propone en la revisión ("¿Este cargo de Amazon es la secadora?").
3. **Modelo como red**: para recibos sin parser, Claude lee el correo y devuelve el mismo JSON (`{ comercio, articulos[], total, msi, entrega, origen, destino }`) con salida estructurada, igual que hoy con los PDF.
4. **Sin recibo**: el descriptor se limpia y se enriquece con el catálogo (`merchants.json`): "UBER *TRIP" → Uber · Viaje; "AMZN MKTP MX" → Amazon · Compra en línea; "OXXO SUC 4521" → Oxxo · Sucursal 4521.

**Dónde se ve:** en el historial, la segunda línea del movimiento pasa de "Compra en línea · BBVA" a "Secadora Remington · 1 de 6 MSI · llega el jueves". En el detalle del movimiento, los artículos completos y el enlace al pedido. Esto es lo que enseña la landing en "Cada cargo, con detalle".

**Datos:** tabla `receipts` (user_id, fuente, external_id, comercio, total_centavos, fecha, articulos jsonb, meta jsonb, movimiento_id nullable) con RLS. El cuerpo del correo nunca se guarda: solo el JSON extraído.

## 3. Cancelar suscripciones (contra los botones escondidos)

Las empresas esconden el botón. Nosotros llevamos al usuario **exactamente** a él y le decimos qué le van a poner enfrente.

1. **Catálogo de cancelación** (`qa/entregables/merchants.json`, ampliado en esta fase): por servicio, `url_cancelacion` directa (no la home), `pasos_cancelacion` cortos, `dificultad`, `requiere_llamada`, y un campo nuevo `truco`: la trampa que va a intentar ("te ofrecerá 3 meses a mitad de precio; di que no y baja hasta 'Cancelar de todos modos'").
2. **Flujo en la app** (`ModalCancelar`): botón grande "Ir a cancelar" que abre el enlace directo, los pasos numerados, el truco resaltado, y "Ya la cancelé" que activa la **vigilancia**: si el cargo vuelve a aparecer en 45 días, aviso con el comprobante.
3. **Cancelar por mí** (para las que exigen llamada o chat, como gimnasios y telefonía): el usuario autoriza con nombre, correo y últimos 4; generamos la **carta de cancelación** (PDF) con fundamento en la Ley Federal de Protección al Consumidor (art. 56 y 76 bis) y el registro en Profeco, y la mandamos por correo al servicio con copia al usuario. Primero manual, después automatizado.
4. **Fuera de la app**: apps de iOS y Android se cancelan desde la tienda; el catálogo enlaza directo a `apps.apple.com/account/subscriptions` y `play.google.com/store/account/subscriptions`.

## Qué hacer primero (mi recomendación)

1. Recibos por correo (Amazon, Uber, Rappi, Mercado Libre) y su casamiento: es lo que más se nota en la pantalla y usa un conector que ya existe.
2. Catálogo de cancelación ampliado con enlaces directos y trucos (hecho en esta fase) y la vigilancia post-cancelación.
3. Notificaciones en Android con la app envuelta en Capacitor: cobertura casi total y en tiempo real, sin claves.
4. Belvo como opción avanzada, nunca como el camino principal.
