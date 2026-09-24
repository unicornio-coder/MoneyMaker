package mx.moneymaker.app

import android.content.Context

/** Token de dispositivo (mmd_…) y URL del servidor. Solo el token se guarda en el teléfono; nunca el texto de las notificaciones. */
object Config {
    private const val PREFS = "moneymaker"
    private const val KEY_TOKEN = "token"
    private const val KEY_URL = "url"

    /** Apps bancarias y de comercios cuyas notificaciones se mandan. Misma lista que src/lib/services/entrada.ts. */
    val PAQUETES = setOf(
        "com.bbva.mx",
        "com.bancomer.mbanking",
        "com.nu.production",
        "com.banorte.movil",
        "mx.banorte.mbanking",
        "mx.santander.supermovil",
        "com.santander.mx",
        "mx.com.hsbc.hsbcmexico",
        "com.banamex.mobile",
        "com.citibanamex.mobile",
        "com.scotiabank.mx",
        "com.hey.banco",
        "mx.klar.klar",
        "com.storicard.app",
        "com.mercadopago.wallet",
        "com.americanexpress.android.acctsvcs.mx",
        "com.amazon.mShop.android.shopping",
        "com.ubercab",
        "com.sdu.didi.psnger",
        "com.grability.rappi",
        "com.mercadolibre",
    )

    fun token(ctx: Context): String? = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_TOKEN, null)

    fun guardarToken(ctx: Context, token: String) {
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY_TOKEN, token.trim()).apply()
    }

    fun url(ctx: Context): String = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_URL, null) ?: BuildConfig.APP_URL

    fun tokenValido(token: String?): Boolean = token != null && Regex("^mmd_[a-f0-9]{48}$").matches(token)
}
