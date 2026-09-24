# Plan de 7 días: app al 100 %, funcionando y publicada, sin depender de nadie

> **Sustituido por `docs/ROADMAP.md`** (JC, 24 sep): primero que la app funcione igual que Rocket Money con datos reales (Belvo encendido); los insights con IA van al final. Este archivo queda como referencia.

Objetivo de JC: en una semana la app completa, usable de punta a punta, en producción, y que después opere
sola (sin humanos en el circuito: ni para publicar, ni para cancelar, ni para dar soporte de primer nivel).

## Qué significa "sin humanos" y dónde sí hay un mínimo humano

Todo lo que es código, pruebas, publicación, monitoreo y operación diaria lo hace Claude Code con los bots.
Quedan **cuatro cosas que un tercero exige que las haga una persona con identidad** (crear cuentas y aceptar
términos). Son ~30 minutos en total, una sola vez, y están listadas al final como checklist. Después de eso, cero.

## Los siete días (Claude Code ejecuta solo; cada día termina con PRs fusionados y en producción)

| Día | Entrega | Resultado visible |
|---|---|---|
| **1. Núcleo real** | Proyección de quincena ("te alcanza hasta el día X", "semana pesada") con tests; contador de ahorro en Inicio; pasada "menos IA" en Inicio, Presupuesto y Patrimonio; estados vacíos con CTA único | Inicio dice cuánto te queda y cuánto te hemos ahorrado |
| **2. Sin humanos en cancelación** | "Cancelar por mí" deja de prometer "nuestro equipo": genera la carta y **la manda por correo al proveedor** (catálogo con correo de cancelación de cada servicio) con copia al usuario, y programa la vigilancia. Sin correo del proveedor: enlace directo + carta para adjuntar | Cancelación en dos toques sin que nadie de MoneyMaker intervenga |
| **3. Datos entrando solos** | **Belvo encendido** en la hoja "Agregar cuenta" como "Conectar mi banco" (widget, cuentas, movimientos, refresco diario; ya integrado, hoy apagado): con las llaves de sandbox conecta bancos de prueba y con las de producción bancos reales, con el aviso honesto de que el widget pide tus credenciales. Correo reenviado con Resend inbound, sincronización cada hora con reintentos, estado de cada fuente en Ajustes; resumen del domingo | El usuario conecta su banco una vez y todo llega solo |
| **4. Plan y cobro** | Gratis vs Plus $149 con límites en código; Stripe Checkout y portal de cliente; paywall suave (el gratis siempre funciona); garantía visible "si no te ahorramos $149 te lo devolvemos" | Se puede pagar y cancelar el plan sin hablar con nadie |
| **5. Soporte sin humanos** | Centro de ayuda en la app (preguntas reales del flujo), asistente de ayuda con Claude sobre los docs del producto, formulario de reporte que abre issue en GitHub etiquetado; correo de bienvenida y de "no has subido tu PDF" automáticos | El usuario resuelve dudas y reporta sin correo humano |
| **6. Confiabilidad** | Bot de salud cada hora (ya existe) + alerta por correo si falla; Sentry o registro propio de errores; respaldo diario de Supabase (pg_dump programado); pruebas E2E de pago y de cancelación; rate limit en endpoints públicos | Si algo se rompe, se sabe en una hora y se sabe dónde |
| **7. Lanzamiento** | Revisión final pantalla por pantalla (claro/oscuro, 390/1440), textos, accesibilidad; landing con sección de precios definitiva; términos y aviso de privacidad revisados; `README` de operación; app Android en Play (si JC firmó el día 1) | Publicado, medible y operando solo |

Cada día sigue el mismo ciclo: tarea → tests → lint/tipos/build → capturas → PR con `publicar` → bot fusiona →
Vercel despliega → bitácora. Si algo necesita una llave que aún no está, queda listo detrás de una variable y
sigue.

## Checklist humano (30 minutos, una vez). Todo lo demás es automático

1. **Rama por defecto del repo → `main`** (GitHub → Settings → General). Sin esto los bots con horario no corren. 1 min.
2. **Google Cloud: cliente OAuth** con `gmail.readonly` y redirect `https://money-maker-tawny.vercel.app/api/gmail/callback`; pegar `GOOGLE_CLIENT_ID/SECRET` en Vercel. 8 min. (La verificación de Google para pasar de 100 usuarios se pide después; el formulario también lo lleno yo.)
3. **Resend**: crear cuenta, verificar un dominio (o subdominio `mail.moneymaker.mx`), pegar `RESEND_API_KEY` y el dominio en Vercel; activar *inbound* al webhook `/api/correo/entrante` con `CORREO_ENTRANTE_SECRET`. 10 min. Con esto salen correos (bienvenida, domingo, cartas de cancelación) y entran los reenviados.
4. **Stripe**: crear los precios Plus mensual y anual y pegar `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` y los `price_id` en Vercel. 6 min.
5. **Android (opcional esta semana)**: abrir `apps/android` en Android Studio, firmar y subir a Play. 30 min + revisión de Google (días). Mientras, la web y el correo cubren todo.
6. **Belvo producción**: en dashboard.belvo.com pedir acceso a producción (datos de la empresa, caso de uso "finanzas personales"; suelen aprobar en días), crear llaves de producción y pegar `BELVO_SECRET_ID`, `BELVO_SECRET_PASSWORD`, `BELVO_ENV=production` y `BELVO_WEBHOOK_SECRET` en Vercel. 10 min + espera de Belvo. Mientras, sandbox. **Finerio Connect** queda como alternativa detrás de la misma interfaz `Aggregator` si Belvo no aprueba; no vale la pena tener los dos.

## Lo que NO vamos a hacer esta semana (a propósito)
- Scraping de portales bancarios (riesgo legal, se rompe).
- CFDI del SAT (es la ventaja grande, pero necesita un proveedor y pruebas con contribuyentes reales: semana 2–3).
- Código por WhatsApp (Meta y proveedor: después de tener usuarios).

## Cómo se mide "al 100 %"
- Un usuario nuevo: registro → onboarding → sube PDF → ve quincena, suscripciones y MSI → cancela una → paga Plus → recibe el resumen del domingo. Todo sin tocar a nadie. Este flujo completo es un E2E que corre en cada PR.
- Salud en verde 24 h seguidas, cero errores 5xx en Vercel, tiempo a "wow" < 3 minutos.
