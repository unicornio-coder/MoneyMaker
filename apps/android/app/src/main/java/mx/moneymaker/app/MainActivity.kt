package mx.moneymaker.app

import android.content.ComponentName
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.provider.Settings
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.NotificationManagerCompat

/** Pantalla única: pegar el código de vinculación, activar el permiso y abrir la app web. */
class MainActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        val campo = findViewById<EditText>(R.id.token)
        campo.setText(Config.token(this) ?: "")

        findViewById<Button>(R.id.guardar).setOnClickListener {
            val t = campo.text.toString().trim()
            if (!Config.tokenValido(t)) {
                Toast.makeText(this, "El código empieza con mmd_ y tiene 52 caracteres.", Toast.LENGTH_LONG).show()
            } else {
                Config.guardarToken(this, t)
                Toast.makeText(this, "Código guardado.", Toast.LENGTH_SHORT).show()
            }
            actualizarEstado()
        }

        findViewById<Button>(R.id.permiso).setOnClickListener {
            startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
        }

        findViewById<Button>(R.id.abrir).setOnClickListener {
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(Config.url(this) + "/app")))
        }
    }

    override fun onResume() {
        super.onResume()
        actualizarEstado()
    }

    private fun permisoActivo(): Boolean {
        val nombre = ComponentName(this, NotificacionesService::class.java)
        return NotificationManagerCompat.getEnabledListenerPackages(this).contains(packageName) &&
            (Settings.Secure.getString(contentResolver, "enabled_notification_listeners") ?: "").contains(nombre.flattenToString())
    }

    private fun actualizarEstado() {
        val estado = findViewById<TextView>(R.id.estado)
        estado.text = when {
            !Config.tokenValido(Config.token(this)) -> getString(R.string.estado_sin_token)
            !permisoActivo() -> getString(R.string.estado_sin_permiso)
            else -> getString(R.string.estado_listo)
        }
    }
}
