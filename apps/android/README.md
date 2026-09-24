# MoneyMaker para Android (notificaciones bancarias)

App mínima en Kotlin. Hace una sola cosa: lee las notificaciones de las apps bancarias de la lista blanca
(`Config.PAQUETES`, la misma que `src/lib/services/entrada.ts`) y las manda a `POST /api/notificaciones`
con el token de dispositivo. El servidor convierte cada notificación en un movimiento o en el detalle de un cargo
y descarta el texto. Ningún texto se guarda en el teléfono.

## Flujo del usuario
1. En la web: Ajustes → Cuentas conectadas → **Vincular mi teléfono** → copiar el código `mmd_…`.
2. En la app: pegar el código → **Guardar código**.
3. **Activar permiso de notificaciones** → Android abre "Acceso a notificaciones" → activar MoneyMaker.
4. Listo. Cada compra que el banco notifique aparece en MoneyMaker en segundos.

## Compilar (JC)
Este proyecto no se compiló en el entorno de Claude (no hay Android SDK). Pasos:
1. Android Studio (Ladybug o más nuevo) → *Open* → `apps/android`.
2. Dejar que sincronice Gradle (AGP 8.5, Kotlin 2.0, compileSdk 35).
3. Ejecutar en un teléfono con Android 8+ (`minSdk 26`).
4. Para producción: *Build → Generate Signed Bundle* y subir a Google Play (categoría Finanzas; declarar el
   permiso `BIND_NOTIFICATION_LISTENER_SERVICE` con el formulario de "Acceso a notificaciones").

## Qué revisar si algo no llega
- La app del banco debe mostrar notificaciones (no solo SMS). BBVA, Nu, Banorte, Santander, HSBC, Hey, Klar,
  Stori y Mercado Pago las mandan al comprar.
- `/api/health` en producción debe responder `ok: true`.
- Un 401 al mandar significa que el código se regeneró en la web: pegar el nuevo.

## Archivos
- `app/src/main/java/mx/moneymaker/app/NotificacionesService.kt`: el `NotificationListenerService`.
- `Envio.kt`: cola con WorkManager (reintentos con backoff, espera red).
- `Config.kt`: token en `SharedPreferences`, lista blanca, URL (`BuildConfig.APP_URL`).
- `MainActivity.kt`: pantalla de vinculación.
