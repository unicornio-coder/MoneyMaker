# Plan de ejecución (24 sep 2026)

Cada tarea dice qué se hace, cómo, quién lo ejecuta (yo desde Claude Code, un bot en GitHub Actions, o JC) y en qué estado va. Todo lo que dice "hecho" está en `main` y Vercel lo publica solo.

## 0. Cómo llega un cambio a la página (automatizado)

| Paso | Quién | Estado |
|---|---|---|
| Cambio en rama, PR a `main` con la etiqueta `publicar` | yo | hecho |
| CI: lint, tipos, pruebas, build, 12 E2E (importación, capturas, onboarding, cancelación) | bot `ci.yml` | hecho |
| Fusión automática a `main` cuando todo está en verde | bot `ci.yml` → job `publicar` | hecho |
| Deploy | Vercel desde `main` | hecho (Cowork confirmó la rama) |
| Guardia: cada hora revisa `/api/health` y las pantallas públicas; abre y cierra un issue | bot `salud.yml` | hecho |
| Logos: los baja y los sube a `main` (a pedido, lunes, y al cambiar catálogos) | bot `logos.yml` | hecho; primera corrida al fusionar #30 |
| Enlaces de cancelación: prueba cada `url_cancelacion` cada semana y reporta rotos | bot `enlaces.yml` | hecho |
| Dependencias: PR semanal agrupado | Dependabot | hecho |

Lo único que no puede hacer un bot: llaves y accesos (Vercel, Supabase, Google, Brandfetch) y la **rama por defecto del repo en GitHub**, que sigue siendo `claude/gallant-bohr-re8e7b`. Los bots con horario (`salud`, `enlaces`, `logos` los lunes) y el botón "Run workflow" solo funcionan desde la rama por defecto: hay que cambiarla a `main` en GitHub → Settings → General → Default branch. Mientras, `logos` corre al fusionar cambios en sus archivos.

## 1. Landing, inicio de sesión y app (diseño)

| Tarea | Cómo | Estado |
|---|---|---|
| Landing Apple × Stori | Una idea por pantalla, producto animado, escena de conexión, "cuánto te queda", suscripciones, detalle por cargo, seguridad, precio una vez | hecho (#27) |
| Entrar / Crear cuenta mínimos | Correo + contraseña; Google secundario; sin frases de relleno | hecho (#27) |
| Olvidé mi contraseña | `/recuperar` manda enlace (Supabase), `/restablecer` guarda | hecho (#27) |
| Código por WhatsApp | Requiere WhatsApp Business API (Meta) y un proveedor (Twilio); se hace después de tener usuarios reales | pendiente (decisión de JC) |
| Onboarding | 4 pasos, nombre real, panel de marca | hecho (#26) |
| Importar con animación de conexión (Rocket Money) | `EscenaConexion` con banco al centro y movimientos en vivo | hecho (#28) |
| App menos "IA": un solo CTA por bloque, menos chips | Inicio (#28); Gastos y Fijos (#36): sin chips de periodo duplicados en la barra, efectivo plegado, una cifra con una línea de contexto, sin dona ni variaciones por tarjeta, Fijos con un solo bloque arriba | hecho |
| Logos reales en producción | bot `logos.yml` | corre al fusionar #30 |

## 2. Conectar todos los movimientos

| Tarea | Cómo | Quién | Estado |
|---|---|---|---|
| PDF de estado de cuenta | Ya existe, asíncrono con etapas | — | hecho |
| Alertas bancarias por correo | `gmail.parsers.ts` (BBVA, Amex, Nu, Banorte, Santander, HSBC, Banamex, Scotiabank) | — | hecho (falta que JC cree el OAuth de Google en producción) |
| Recibos por correo (Amazon, Mercado Libre, Uber, DiDi, Rappi, Uber Eats) | `recibos.ts` + `enriquecer.ts` | yo | hecho (#31) |
| Outlook / Hotmail | `services/outlook.ts` (Microsoft Graph `Mail.Read`), `/api/outlook/auth|callback`, mismo pipeline que Gmail (`buzon.ts`), cron y Ajustes; detrás de `MS_CLIENT_ID/SECRET` | yo | código hecho (#37); JC: app en Entra ID |
| Dirección de reenvío `<alias>@in.moneymaker.mx` | `/api/correo/entrante` listo (firma HMAC o secreto, Resend/Postmark/Cloudflare); alias por usuario en Ajustes. Falta: dominio, MX y `CORREO_ENTRANTE_SECRET` en Vercel | yo (hecho) + JC (DNS y secreto) | código hecho |
| Notificaciones en Android | Servidor listo: `/api/notificaciones` con token por usuario (Ajustes → "Vincular mi teléfono"), lista blanca de 20 apps, mismo parser y misma ingesta. Falta la app Android (Capacitor + `NotificationListenerService`) | yo (servidor hecho; app siguiente) + JC (Google Play) | servidor hecho |
| Belvo como opción avanzada | Ya integrado en sandbox; activarlo en la hoja de "Agregar cuenta" con el aviso de que comparte credenciales | JC decide | pendiente |

## 3. Detalle por cargo (Amazon, Uber…)

| Tarea | Cómo | Estado |
|---|---|---|
| Parsers de recibos | Regex por comercio; total, artículos, MSI, entrega, origen/destino, restaurante | hecho |
| Casamiento recibo ↔ cargo | Descriptor compatible + monto ±1 % + fecha ±3 días; el mejor gana; ≥ 0.6 | hecho |
| Recibos que llegan antes que el cargo | Pendientes 45 días en la credencial; se casan al confirmar un PDF | hecho |
| Mostrarlo | Segunda línea en historial, drawer y Gastos; bloque "Lo que compraste" en el detalle; ⌘K busca en el detalle | hecho |
| Recibos sin parser | `extraerReciboConLLM` (Claude, salida estructurada, effort low) en Gmail, correo reenviado y notificaciones; solo remitentes que no son banco; sin llave se ignora | hecho |
| Descriptor sin recibo | `detalleBasico`: "UBER *TRIP" → Viaje; "OXXO SUC 4521" → Sucursal 4521; "AMZN MKTP" → Compra en línea; "MERCADOPAGO*X" → Pago a X | hecho |

## 4. Cancelar suscripciones

| Tarea | Cómo | Estado |
|---|---|---|
| Catálogo con enlace directo, pasos y truco | 26 servicios en `merchants.json` | hecho (#28) |
| Flujo en la app | "Ir directo a cancelar", aviso con el truco, pasos, "Ya la cancelé" | hecho (#28, #29) |
| Vigilancia post-cancelación | Si el cargo regresa en 45 días → insight "Te siguen cobrando" con comprobante | siguiente |
| Cancelar por mí (llamada/chat) | Carta de cancelación en PDF (`domain/carta.ts` + `services/carta.ts` con pdf-lib, `/api/cancelacion/carta`) con fundamento LFPC arts. 7, 56 y 76 bis; se descarga desde "Solicitud recibida" y desde el drawer. Envío por correo al servicio: pendiente (necesita remitente) | hecho (#38) |
| Enlaces vivos | bot `enlaces.yml` semanal | hecho |

## Lo que solo JC puede hacer

0. GitHub → Settings → General → Default branch → `main` (un clic). Sin esto no corren los bots con horario.

1. Google Cloud: cliente OAuth con `gmail.readonly` y poner `GOOGLE_CLIENT_ID/SECRET` en Vercel (para alertas y recibos por correo).
2. Brandfetch (opcional, mejores logos): client id gratuito en `BRANDFETCH_CLIENT_ID` como secreto del repo en GitHub.
3. Decidir WhatsApp (código de acceso) y Belvo (opción avanzada).
4. Para notificaciones Android: cuenta de Google Play Console (USD 25, una vez).
