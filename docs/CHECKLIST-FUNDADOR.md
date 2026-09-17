# Checklist del fundador · lo único que no puedo hacer por ti

Todo lo de código ya está hecho y probado. Esto requiere **tus cuentas, tus tarjetas o tu firma**. Tiempo total: ~2 horas repartidas; el orden importa. Cada bloque dice qué pegar en Vercel.

## 0. Vercel (10 min) → tienes la app pública, aunque sea en modo demo
1. Entra a vercel.com → **Add New → Project** → importa `unicornio-coder/MoneyMaker`.
2. En *Git Branch* elige `claude/gallant-bohr-re8e7b` (o haz merge a `main` primero; el proyecto no tiene `main` todavía).
3. Framework: Next.js (lo detecta). Deploy sin variables. Al terminar tienes `https://moneymaker-xxx.vercel.app` en modo demo.
4. Settings → Environment Variables → agrega `NEXT_PUBLIC_APP_URL = https://<tu-dominio>` y `CRON_SECRET` (cualquier cadena larga; Vercel la usa para llamar `/api/cron/sync` a las 6:00 CDMX).
5. `CREDENTIALS_KEY`: cualquier cadena larga y secreta (32 caracteres o más); con ella se cifran las llaves de Gmail y Bitso.
6. (Opcional) Settings → Domains → tu dominio.

## 1. Supabase (20 min) → usuarios reales
1. supabase.com → **New project** (región `us-east-1` o la más cercana; guarda la contraseña de la base).
2. SQL Editor → **New query** → pega el contenido de `supabase/migrations/0001_init.sql` → Run. Luego lo mismo con `0002_fase2.sql`.
3. Authentication → Providers → **Email**: enciende *Confirm email* si quieres verificación (recomendado en producción). **Google**: enciende y pega Client ID/Secret del paso 4.
4. Authentication → URL Configuration → *Site URL* = tu dominio de Vercel; *Redirect URLs* = `https://<dominio>/auth/callback`.
5. Project Settings → API → copia a Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (secreta; nunca en el cliente)
   - y pon `NEXT_PUBLIC_USE_MOCK = false`.
6. Redeploy en Vercel. Prueba: crea tu cuenta en `/registro`, pasa el onboarding, sube un estado de cuenta.

## 2. Belvo (15 min hoy + semanas para producción) → bancos automáticos
1. developers.belvo.com → crea cuenta → Dashboard → **API Keys (Sandbox)** → copia a Vercel: `BELVO_SECRET_ID`, `BELVO_SECRET_PASSWORD`, `BELVO_ENV = sandbox`.
2. Dashboard → **Webhooks** → URL `https://<dominio>/api/belvo/webhook`, Authorization header con una cadena secreta → pégala en Vercel como `BELVO_WEBHOOK_SECRET`. Activa eventos de `TRANSACTIONS` y `ACCOUNTS`.
3. Redeploy. En la app, "Vincular banco" abre el widget real con instituciones de prueba (usuario `bnk100`, contraseña `full` en sandbox).
4. **Manda hoy el correo a ventas** (texto en `docs/correo-belvo.md`) a sales@belvo.com y, con el mismo texto, a Syncfy y Finerio para comparar. Cuando firmen: cambia `BELVO_ENV = production` y las llaves de producción.

## 3. Google Cloud (20 min) → login con Google hoy, Gmail en modo prueba
1. console.cloud.google.com → nuevo proyecto "MoneyMaker".
2. APIs & Services → **OAuth consent screen** → External → nombre, correo de soporte, dominio autorizado (tu dominio de Vercel). Scopes: agrega `.../auth/userinfo.email` y `.../auth/gmail.readonly`. **Test users**: agrega tu correo y los de tus primeros probadores (máximo 100). Guarda en *Testing* (no pidas verificación todavía).
3. APIs & Services → **Library** → habilita **Gmail API**.
4. Credentials → **Create credentials → OAuth client ID → Web application**. Authorized redirect URIs (las dos):
   - `https://<tu-proyecto>.supabase.co/auth/v1/callback` (login con Google, lo da Supabase en Providers → Google)
   - `https://<dominio>/api/gmail/callback` (lectura de alertas)
5. Copia a Vercel `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`, y pégalos también en Supabase → Auth → Providers → Google.
6. Redeploy. En Ajustes → Cuentas conectadas aparece "Conectar Gmail". Activa en tu banco las alertas por correo de cada compra (BBVA: app → Perfil → Notificaciones; Amex: Alertas de cuenta).

## 4. Anthropic (5 min, opcional pero recomendado)
console.anthropic.com → API Keys → crea una → Vercel `ANTHROPIC_API_KEY`. Habilita PDFs de estados de cuenta y comercios desconocidos. Costo estimado: centavos por usuario al mes.

## 5. Stripe (25 min) → cobrar
1. dashboard.stripe.com → activa tu cuenta (datos fiscales, CLABE para depósitos). Mientras, usa **modo prueba**.
2. Products → **Add product** "MoneyMaker Premium" → dos precios recurrentes: `$250 MXN / mes` y `$2,500 MXN / año`. Copia los IDs `price_...` a Vercel: `STRIPE_PRICE_MENSUAL`, `STRIPE_PRICE_ANUAL`.
3. Developers → API keys → `STRIPE_SECRET_KEY` (sk_test_… primero; sk_live_… al lanzar).
4. Developers → Webhooks → **Add endpoint** `https://<dominio>/api/stripe/webhook` con eventos: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`. Copia el *Signing secret* a Vercel `STRIPE_WEBHOOK_SECRET`.
5. Settings → Billing → **Customer portal**: activa cancelar y cambiar de plan.
6. Redeploy. En Planes, "Empezar 7 días gratis" abre Checkout. Tarjeta de prueba `4242 4242 4242 4242`.

## 6. Bitso (5 min, si tienes cuenta)
Bitso → Perfil → API → Nueva llave con permisos **solo de consulta** (sin retiros ni trading). Pégala en la app: Ajustes → Cuentas conectadas → Bitso. Se guarda cifrada con `CREDENTIALS_KEY`.

## 7. Legal (1 hora con un abogado)
`/legal/privacidad` y `/legal/terminos` ya tienen borradores completos. Falta: tu razón social y domicilio en el aviso, y una revisión legal. No lances a usuarios de pago sin esa revisión.

## 8. Usuarios (Fase 3)
Reúne 20–50 personas de confianza (menos de 100, por la regla de Gmail). Agrégalas como *Test users* en Google si van a conectar Gmail. Mándales el enlace y pídeles: conectar o subir una cuenta el primer día. Yo te doy el tablero de métricas leyendo la tabla `events`.

## Resumen de variables en Vercel
```
NEXT_PUBLIC_APP_URL, CRON_SECRET, CREDENTIALS_KEY
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_USE_MOCK=false
BELVO_SECRET_ID, BELVO_SECRET_PASSWORD, BELVO_ENV, BELVO_WEBHOOK_SECRET
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
ANTHROPIC_API_KEY
STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_MENSUAL, STRIPE_PRICE_ANUAL
```
