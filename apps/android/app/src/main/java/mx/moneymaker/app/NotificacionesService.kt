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

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        val paquete = sbn.packageName ?: return
        if (paquete !in Config.PAQUETES) return
        if (!Config.tokenValido(Config.token(this))) return
        // Solo notificaciones nuevas (no las que Android reposta al reconectar el servicio) y no las de grupo.
        if (sbn.notification.flags and Notification.FLAG_GROUP_SUMMARY != 0) return

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
