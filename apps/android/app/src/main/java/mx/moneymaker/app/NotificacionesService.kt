package mx.moneymaker.app

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import java.time.Instant

/**
 * Escucha las notificaciones del teléfono y reenvía solo las de las apps de la lista blanca (bancos y comercios
 * con recibo). El texto viaja al servidor, se convierte en movimiento o detalle y se descarta: no se guarda en el
 * teléfono ni en el servidor.
 */
class NotificacionesService : NotificationListenerService() {

    /** Claves ya enviadas (una notificación que se actualiza dispara onNotificationPosted otra vez). */
    private val enviadas = object : LinkedHashMap<String, Long>(64, 0.75f, true) {
        override fun removeEldestEntry(eldest: MutableMap.MutableEntry<String, Long>?) = size > 200
    }

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        val paquete = sbn.packageName ?: return
        if (paquete !in Config.PAQUETES) return
        if (!Config.tokenValido(Config.token(this))) return
        if (sbn.notification.flags and Notification.FLAG_GROUP_SUMMARY != 0) return
        // Misma notificación actualizada (misma clave y misma hora): ya se mandó.
        val clave = "${sbn.key}|${sbn.postTime}"
        synchronized(enviadas) { if (enviadas.containsKey(clave)) return else enviadas[clave] = sbn.postTime }

        val extras = sbn.notification.extras
        val titulo = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString() ?: ""
        val texto = listOfNotNull(
            extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString(),
            extras.getCharSequence(Notification.EXTRA_TEXT)?.toString(),
        ).firstOrNull { it.isNotBlank() } ?: return

        val hora = Instant.ofEpochMilli(sbn.postTime).toString()
        Envio.encolar(this, paquete, titulo, texto, hora)
    }
}
