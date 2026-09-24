package mx.moneymaker.app

import android.content.Context
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.Data
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/**
 * Manda una notificación a POST /api/notificaciones con reintentos (WorkManager: sobrevive a que cierren la app
 * y espera a tener red). El cuerpo es { notificaciones: [{ paquete, titulo, texto, hora }] }.
 */
object Envio {
    fun encolar(ctx: Context, paquete: String, titulo: String, texto: String, hora: String) {
        val datos = Data.Builder()
            .putString("paquete", paquete)
            .putString("titulo", titulo.take(200))
            .putString("texto", texto.take(4000))
            .putString("hora", hora)
            .build()
        val trabajo = OneTimeWorkRequestBuilder<EnvioWorker>()
            .setInputData(datos)
            .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
            .build()
        WorkManager.getInstance(ctx).enqueue(trabajo)
    }
}

class EnvioWorker(ctx: Context, params: WorkerParameters) : CoroutineWorker(ctx, params) {
    override suspend fun doWork(): Result {
        val token = Config.token(applicationContext)
        if (!Config.tokenValido(token)) return Result.failure()
        val n = JSONObject()
            .put("paquete", inputData.getString("paquete"))
            .put("titulo", inputData.getString("titulo") ?: "")
            .put("texto", inputData.getString("texto") ?: "")
            .put("hora", inputData.getString("hora"))
        val cuerpo = JSONObject().put("notificaciones", JSONArray().put(n)).toString()
        val req = Request.Builder()
            .url(Config.url(applicationContext) + "/api/notificaciones")
            .header("Authorization", "Bearer $token")
            .post(cuerpo.toRequestBody("application/json; charset=utf-8".toMediaType()))
            .build()
        return try {
            cliente.newCall(req).execute().use { res ->
                when {
                    res.isSuccessful -> Result.success()
                    res.code == 401 -> Result.failure() // token revocado: no insistir
                    res.code == 408 || res.code == 429 || res.code in 500..599 -> Result.retry()
                    else -> Result.failure()
                }
            }
        } catch (e: Exception) {
            if (runAttemptCount < 8) Result.retry() else Result.failure()
        }
    }

    companion object {
        private val cliente = OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .build()
    }
}
