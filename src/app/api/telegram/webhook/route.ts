import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getRepo } from '@/lib/data';
import { repoSupabaseCon } from '@/lib/data/repo.supabase';
import { MODO_MOCK } from '@/lib/supabase/env';
import { supabaseAdmin } from '@/lib/supabase/server';
import { datosDelBot, enviarMensaje, leerCodigoVinculo, responderPregunta, secretoWebhook, telegramConfigurado } from '@/lib/services/telegram';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const SIN_VINCULO = 'Para saber quién eres necesito que conectes tu cuenta: entra a MoneyMaker, abre Ajustes → Cuentas conectadas → Telegram y toca "Conectar Telegram".';
const BIENVENIDA = 'Listo, tu cuenta de MoneyMaker quedó conectada. Pregúntame cuánto te queda de la quincena, cuánto pagas de suscripciones o qué cobros vienen esta semana.';

type Update = { message?: { text?: string; chat?: { id?: number; type?: string } } };

/**
 * Webhook del bot de Telegram. Telegram manda aquí cada mensaje con el secreto en `x-telegram-bot-api-secret-token`.
 * Solo atiende chats privados. `/start <código>` vincula el chat con la cuenta; cualquier otro texto es una pregunta.
 * Siempre responde 200 a Telegram (salvo secreto inválido) para que no reintente; el texto del mensaje no se guarda.
 */
export async function POST(req: Request) {
  if (!telegramConfigurado()) return NextResponse.json({ codigo: 'no_configurado' }, { status: 503 });
  const recibido = Buffer.from(req.headers.get('x-telegram-bot-api-secret-token') ?? '');
  const esperado = Buffer.from(secretoWebhook());
  if (recibido.length !== esperado.length || !timingSafeEqual(recibido, esperado)) return NextResponse.json({ codigo: 'no_autorizado' }, { status: 401 });

  let update: Update;
  try {
    update = (await req.json()) as Update;
  } catch {
    return NextResponse.json({ ok: true });
  }
  const chat = update.message?.chat;
  const texto = (update.message?.text ?? '').trim();
  if (!chat || typeof chat.id !== 'number' || chat.type !== 'private' || !texto) return NextResponse.json({ ok: true });
  const chatId = String(chat.id);

  try {
    const repo = MODO_MOCK ? getRepo() : repoSupabaseCon(() => supabaseAdmin());

    if (texto.startsWith('/start')) {
      const codigo = texto.split(/\s+/)[1] ?? '';
      const userId = codigo ? leerCodigoVinculo(codigo) : null;
      if (!userId) {
        const ya = await repo.usuarioDeTelegram(chatId);
        await enviarMensaje(chatId, ya ? BIENVENIDA : codigo ? `Ese enlace ya venció. ${SIN_VINCULO}` : SIN_VINCULO);
        return NextResponse.json({ ok: true });
      }
      await repo.vincularTelegram(userId, chatId);
      await repo.registrarEvento(userId, 'telegram_vinculado', {}).catch(() => undefined);
      await enviarMensaje(chatId, BIENVENIDA);
      return NextResponse.json({ ok: true });
    }

    const userId = await repo.usuarioDeTelegram(chatId);
    if (!userId) {
      await enviarMensaje(chatId, SIN_VINCULO);
      return NextResponse.json({ ok: true });
    }
    if (texto === '/salir') {
      await repo.desvincularTelegram(userId);
      await enviarMensaje(chatId, 'Desconecté este chat de tu cuenta de MoneyMaker.');
      return NextResponse.json({ ok: true });
    }

    const inicio = Date.now();
    const datos = await datosDelBot(repo, userId);
    const r = await responderPregunta(texto, datos);
    await enviarMensaje(chatId, r.texto);
    // Métrica sin contenido: qué se preguntó (por tipo), quién redactó y si se descartó una redacción con cifras ajenas.
    await repo.registrarEvento(userId, 'telegram_respuesta', { intencion: r.intencion, origen: r.origen, cifras_descartadas: r.descartada.length, ms: Date.now() - inicio }).catch(() => undefined);
  } catch (e) {
    console.warn('[telegram] webhook', e instanceof Error ? e.message.slice(0, 120) : 'error');
    await enviarMensaje(chatId, 'No pude consultar tus datos en este momento. Intenta de nuevo en un minuto.');
  }
  return NextResponse.json({ ok: true });
}
