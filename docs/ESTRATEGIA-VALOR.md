# MoneyMaker: de "lector de PDFs" a "el que sabe de tu dinero antes que tú"

Documento de dirección (CEO/CIO). Qué valor damos hoy, qué datos nos faltan y por dónde entran, qué insights
vamos a dar y con qué modelo de negocio. Todo lo de "hoy" está verificado contra el código; lo demás es plan.

## 1. Qué valor da MoneyMaker hoy (verificado en el código)

| Valor | Cómo lo damos | Dónde vive |
|---|---|---|
| Ver todo en un lugar sin claves del banco | PDF del estado de cuenta → cuentas, movimientos, categoría por reglas + Claude | `services/importacion.ts`, `domain/categorizar.ts` |
| Quincena en vez de mes | Días de pago detectados con la nómina; presupuesto y "cuánto te queda" por quincena | `domain/quincena.ts`, `domain/presupuesto.ts` |
| Suscripciones detectadas y cancelables | Recurrentes por patrón, catálogo de 26 servicios con enlace directo, truco y carta PDF con LFPC; vigilancia si vuelven a cobrar | `domain/recurrentes.ts`, `ModalCancelar`, `/api/cancelacion/carta` |
| Meses sin intereses bajo control | Cuota N de M, cuándo termina, cuánto pesa al mes | `domain/recurrentes.ts` (tipo `msi`) |
| Detalle por cargo | Recibos de Amazon, Meli, Uber, DiDi, Rappi y Claude para el resto → "Secadora Remington · 1 de 6 MSI" | `services/recibos.ts`, `enriquecer.ts` |
| Movimientos en tiempo real (sin PDF) | Alertas por Gmail/Outlook, notificaciones Android, correo reenviado | `buzon.ts`, `entrada.ts`, `apps/android` |
| Patrimonio y P&L | Activos, pasivos, flujo neto del mes | `Patrimonio.tsx` |
| Insights | Puedes invertir, MSI por terminar, suscripción nueva, cargo duplicado, comisiones, cobro tras cancelar | `domain/insights.ts` |

**Diagnóstico honesto.** El PDF es un buen primer paso (cero fricción legal, cero claves), pero tiene tres límites:
llega una vez al mes y con 30 días de retraso; solo trae lo que el banco imprime (descriptor de 20 letras, sin
artículo, sin categoría); y muchos usuarios no lo tienen a la mano. Los insights actuales son correctos pero
"pasivos": describen el pasado. El valor grande está en **anticipar** (qué te va a pasar el 15) y en **actuar**
por el usuario (cancelar, negociar, mover dinero).

## 2. De dónde van a salir los datos (rutas, con costo y riesgo)

| Ruta | Qué trae | Fricción usuario | Costo/riesgo | Estado |
|---|---|---|---|---|
| **A. Notificaciones del teléfono (Android)** | Cada cargo en segundos, de cualquier banco que notifique (BBVA, Nu, Banorte, Santander, HSBC, Hey, Klar, Stori, Mercado Pago) | Instalar app + un permiso | $0. Legal (el usuario lo autoriza). iOS no lo permite | Servidor y app hechos; JC compila |
| **B. Correo (Gmail/Outlook + reenvío)** | Alertas de compra y recibos con detalle (Amazon, Uber, Meli…) | Un OAuth | $0. Necesita verificación de Google (100 usuarios en prueba) | Hecho |
| **C. Belvo (open banking, agregador)** | Saldos y movimientos de BBVA, Banorte, Santander, HSBC, Citibanamex, Scotiabank; historial 12 meses; refresco diario | Escribir usuario/contraseña del banco en el widget | ~USD 0.30–0.60 por cuenta/mes. Comparte credenciales (explicarlo). MFA a veces rompe | Integrado en sandbox; apagado por decisión |
| **D. CFDI del SAT (facturas electrónicas)** | Cada compra facturada con **concepto, cantidad, IVA, RFC del comercio**: gasolina, súper, escuela, médico, renta. Además deducciones para la anual | Subir e.firma o CIEC una vez | $0 con la API del SAT / ~$1 MXN por CFDI con proveedores (Syncfy, Facturama). Alta sensibilidad: cifrar y borrar | Por hacer. **Es la mina de oro de detalle en México** |
| **E. SMS bancarios (Android)** | Bancos que aún avisan por SMS | Permiso de SMS | $0. Google Play restringe el permiso SMS: justificar o quedarnos con A | Por hacer, mismo camino que A |
| **F. Scraping del portal del banco** | Todo lo que ve el usuario | Nada (nosotros) | Viola términos del banco, se rompe cada semana, riesgo legal y reputacional | **No**. Belvo ya hace esto con contrato |
| **G. Buró de Crédito** | Score, cuentas abiertas, atrasos, límite de crédito | Autorización por NIP | Círculo de Crédito o Buró: ~USD 1–2 por consulta | Por hacer; sirve para "salir de deudas" |
| **H. Captura asistida** | Efectivo, préstamos entre amigos, tandas | Teclear | $0 | Hecho (efectivo) |

**Decisión recomendada (orden):** A y B ya están: activarlos con usuarios reales. Luego **D (CFDI)** porque nadie
en México lo hace bien y convierte "AMAZON MX $1,299" en "Secadora Remington" para todo lo facturado. **C (Belvo)**
como opción "conectar mi banco" para quien quiera saldo en vivo y historial de 12 meses, cobrándolo dentro del plan.
G cuando tengamos el módulo de deudas. F nunca.

## 3. Plan de insights: de describir a anticipar y actuar

Cada insight tiene tres partes: **dato** (qué vimos), **consecuencia** (qué te pasa) y **acción** (un botón).
Ordenados por valor para el usuario y por facilidad.

### Ya (con los datos que tenemos)
1. **Te alcanza hasta el día X.** Proyección de la quincena: ingreso − fijos − MSI − gasto habitual por día. "A este ritmo te quedas en cero el día 12". Acción: ver qué recortar.
2. **Se te viene una semana pesada.** Los cobros de los próximos 7 días (Netflix 18, CFE 13, Liverpool 15) contra el saldo. Acción: mover fecha de cobro o pagar con otra tarjeta.
3. **Fecha límite de pago de tarjeta y cuánto conviene pagar.** Pago mínimo vs total vs "para no generar intereses": cuántos pesos de interés te ahorras. Acción: enlace a la app del banco.
4. **Subieron el precio.** Netflix pasó de $219 a $249 (ya lo detectamos): cuánto al año. Acción: cancelar o bajar de plan.
5. **Suscripción que no usas.** Sin recibo de uso en 60 días (Uber One sin viajes, Spotify sin correo de resumen). Acción: cancelar en dos toques.
6. **Gasto hormiga con nombre.** "Oxxo: 14 visitas, $1,860 este mes". Acción: meta de reducirlo.
7. **Puedes invertir $X** (ya existe): añadir "si lo metes a CETES hoy, en 12 meses son $Y" con la tasa vigente.

### Con notificaciones y correo (semanas)
8. **Cargo que no reconoces.** Comercio nuevo + monto atípico + hora rara → aviso en segundos. Acción: reportar al banco (guion).
9. **Te cobraron doble** en tiempo real (ya existe en batch).
10. **Reembolso que no llegó.** Cancelación de Amazon/Uber sin abono en 10 días.

### Con CFDI (mes 2–3)
11. **Qué compras exactamente** por categoría real (gasolina por litro, súper por artículo, escuela).
12. **Deducciones para tu anual**: colegiaturas, médico, hipoteca. "Llevas $18,400 deducibles; la devolución estimada es $2,900".
13. **Comparación con gente como tú** (anónimo, agregado): "gastas 35 % más en comida a domicilio que usuarios de tu ingreso".

### Con Belvo o Buró (mes 3–6)
14. **Plan para salir de deudas**: avalancha vs bola de nieve, fecha de libertad, cuánto interés te ahorras.
15. **Score y qué lo mueve.**

### Motor
- `domain/insights.ts` ya genera insights puros a partir de movimientos y recurrentes; se amplía con un módulo de
  **proyección** (`domain/proyeccion.ts`: gasto habitual por día de la quincena, cobros programados, saldo esperado).
- Cada insight guarda `leido/descartado` (ya existe) y ganará `accionado` para medir qué sirve.
- Entrega: en la app (tab Insights), **push** (PWA/Android) y un **resumen del domingo** por correo/WhatsApp.

## 4. Que la app emocione (no solo informe)

1. **El momento "wow" en el primer minuto**: al terminar el primer PDF, una pantalla con tres números grandes:
   "Pagas $2,490 al mes en cosas fijas · 3 suscripciones · Te sobran $3,150 esta quincena". Ya casi está (Resultado); falta el cierre emocional y compartir.
2. **Contador de ahorro real**: "Desde que llegaste, MoneyMaker te ahorró $7,776" (cancelaciones + precios evitados). En Inicio, siempre visible. Es el número que vende.
3. **Domingo de cuentas**: resumen semanal a las 9 am, 5 líneas, tono humano ("Esta semana gastaste menos en delivery. Sigue así."). Correo hoy; WhatsApp después.
4. **Metas con fecha y con cara**: "Viaje a Oaxaca, $12,000, 14 de diciembre" con barra y aportación automática sugerida por quincena. Existe Objetivos; falta conectarlo con la quincena y con el excedente.
5. **Rachas**: quincenas seguidas terminando en positivo. Sin gamificación infantil: un número y una frase.
6. **Celebrar cancelaciones**: al cancelar, pantalla "Listo. Son $2,988 al año que se quedan contigo" (existe) + botón compartir.
7. **Modo pareja / familia**: dos cuentas, un presupuesto, quién gastó qué (ya está en el onboarding como meta).
8. **Notificaciones que valen la pena**: máximo 1 al día, solo si hay acción (cargo raro, precio subió, fecha límite mañana).

## 5. Modelo de negocio

**Hoy**: $250 MXN/mes, 7 días gratis, un solo plan. Es caro para México antes de demostrar valor (Stori y Nu son gratis; Rocket Money cobra USD 4–12 pero en EUA).

**Propuesta**:
1. **Gratis para siempre**: 1 PDF al mes, quincena, suscripciones detectadas, 3 insights. Esto crea el hábito y el boca a boca.
2. **Plus $149 MXN/mes o $1,290/año**: PDFs ilimitados, tiempo real (correo/Android), detalle por cargo, cancelación por nosotros con carta, proyección de quincena, resumen del domingo, familia. Mensaje: "Si no te ahorramos más de $149 al mes, te lo devolvemos" (el contador de ahorro lo respalda).
3. **Ingresos que no dependen de la suscripción** (llegan después, con volumen):
   - **Comisión por cancelación/negociación** exitosa de servicios grandes (internet, telefonía, seguros): 20–30 % del ahorro del primer año, como Rocket Money.
   - **Afiliación honesta**: CETES Directo, GBM+, Nu, tarjetas sin anualidad, seguros. Solo cuando el insight lo justifica ("te sobran $3,150: aquí rinde 10 %"). Comisión por alta.
   - **B2B2C**: empresas que lo dan a su nómina como beneficio (bienestar financiero), $60–80 MXN por empleado/mes. Ahí el PDF de nómina y la quincena encajan perfecto.
4. **No vender datos**. Nunca. Es la promesa que nos diferencia de una fintech y es lo que la LFPDPPP exige.

**Métricas que importan**: activación (subió PDF o conectó correo en 24 h), "wow" visto, ahorro acumulado por usuario, cancelaciones hechas, retención a 30 y 90 días, conversión gratis→Plus.

## 6. Ruta de 90 días

| Semanas | Entrega |
|---|---|
| 1–2 | Usuarios reales en A y B (JC: OAuth de Google, app Android en Play). Proyección de quincena ("te alcanza hasta el día X") y semana pesada. Contador de ahorro en Inicio. |
| 3–4 | Resumen del domingo por correo. Insights de precio subido y suscripción sin uso con acción. Plan gratis vs Plus en Stripe. |
| 5–8 | CFDI del SAT: alta con CIEC, descarga, casamiento con cargos, deducciones. Comparación anónima por ingreso. |
| 9–12 | Belvo como opción "conectar banco". Módulo de deudas (fecha de libertad). Modo familia. B2B2C piloto con una empresa. |

Cada entrega se mide con las métricas de arriba; lo que no mueva activación o ahorro se quita.
