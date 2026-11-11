// Bot de Telegram "¿Cuánto me queda?". El usuario vincula su chat desde Ajustes y pregunta en lenguaje natural;
// el bot contesta con las cifras que ya calcula la app (Presupuesto y Suscripciones) y Claude solo redacta.
// Sin TELEGRAM_BOT_TOKEN el bot no existe; sin ANTHROPIC_API_KEY contesta con la redacción fija de reglas.
// Nunca se guarda el texto de los mensajes.

import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { Repo } from '@/lib/data/repo';
import { aISO, deISO, hoyMX, sumarMeses } from '@/lib/domain/fechas';
import { estimarIngresoQuincenal } from '@/lib/domain/nomina';
import { presupuestoVsActual, proponerPresupuesto } from '@/lib/domain/presupuesto';
import { ultimoRangoConDatos } from '@/lib/domain/series';
import { armarDatosBot, cifrasInventadas, intencionDe, respuestaDeReglas, type DatosBot, type Intencion } from '@/lib/domain/telegram';
import { formatMXN } from '@/lib/format';
import { hayLLM, redactarRespuestaBot } from './llm';

const API = 'https://api.telegram.org';
const VIGENCIA_VINCULO_S = 15 * 60;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function telegramConfigurado(): boolean {
  return !!process.env.TELEGRAM_BOT_TOKEN;
}

/** Secreto que Telegram manda en cada llamada al webhook. Se deriva del token: no hace falta otra variable. */
export function secretoWebhook(): string {
  return createHash('sha256').update(`webhook:${process.env.TELEGRAM_BOT_TOKEN ?? ''}`).digest('hex');
}

function firma(datos: Buffer): Buffer {
  return createHmac('sha256', `vinculo:${process.env.TELEGRAM_BOT_TOKEN ?? ''}`).update(datos).digest().subarray(0, 16);
}

/**
 * Código de un solo propósito para el enlace t.me/<bot>?start=<código>: id del usuario + vencimiento, firmado.
 * No se guarda en la base: el webhook lo verifica con la firma. Vale 15 minutos.
 */
export function crearCodigoVinculo(userId: string, ahora = Date.now()): string | null {
  if (!UUID.test(userId)) return null;
  const cuerpo = Buffer.alloc(20);
  Buffer.from(userId.replace(/-/g, ''), 'hex').copy(cuerpo, 0);
  cuerpo.writeUInt32BE(Math.floor(ahora / 1000) + VIGENCIA_VINCULO_S, 16);
  return Buffer.concat([cuerpo, firma(cuerpo)]).toString('base64url');
}

/** Devuelve el id del usuario si el código es auténtico y no ha vencido. */
export function leerCodigoVinculo(codigo: string, ahora = Date.now()): string | null {
  let crudo: Buffer;
  try {
    crudo = Buffer.from(codigo, 'base64url');
  } catch {
    return null;
  }
  if (crudo.length !== 36) return null;
  const cuerpo = crudo.subarray(0, 20);
  if (!timingSafeEqual(crudo.subarray(20), firma(cuerpo))) return null;
  if (cuerpo.readUInt32BE(16) * 1000 < ahora) return null;
  const h = cuerpo.subarray(0, 16).toString('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

async function llamar<T>(metodo: string, cuerpo?: Record<string, unknown>): Promise<T | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;
  try {
    const res = await fetch(`${API}/bot${token}/${metodo}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(cuerpo ?? {}), cache: 'no-store' });
    const json = (await res.json()) as { ok: boolean; result?: T };
    return json.ok ? (json.result ?? null) : null;
  } catch {
    return null;
  }
}

export async function enviarMensaje(chatId: string, texto: string): Promise<boolean> {
  return (await llamar<unknown>('sendMessage', { chat_id: chatId, text: texto })) !== null;
}

/**
 * Deja el bot listo: lee su nombre de usuario y apunta el webhook a esta app si aún no lo está.
 * Se llama cuando alguien abre "Conectar Telegram", así no hay pasos manuales después de poner el token.
 */
export async function prepararBot(urlApp: string): Promise<{ usuario: string } | null> {
  const yo = await llamar<{ username?: string }>('getMe');
  if (!yo?.username) return null;
  const destino = `${urlApp.replace(/\/$/, '')}/api/telegram/webhook`;
  const info = await llamar<{ url?: string }>('getWebhookInfo');
  if (info?.url !== destino) await llamar<unknown>('setWebhook', { url: destino, secret_token: secretoWebhook(), allowed_updates: ['message'], drop_pending_updates: true });
  return { usuario: yo.username };
}

/**
 * Las cifras del usuario para el bot, calculadas igual que la pantalla de Presupuesto: misma ventana de movimientos,
 * mismo periodo (la quincena en curso o, si no tiene movimientos, el último periodo con datos) y mismo presupuesto.
 */
export async function datosDelBot(repo: Repo, userId: string, hoy = hoyMX()): Promise<DatosBot> {
  const [perfil, movs, recurrentes] = await Promise.all([repo.perfil(userId), repo.movimientos(userId, { desde: aISO(sumarMeses(hoy, -13)) }), repo.recurrentes(userId)]);
  const diasPago = perfil?.diasPago ?? [5, 20];
  const { rango, actual } = ultimoRangoConDatos(movs, 'q', hoy, diasPago);
  const ingreso = perfil?.ingresoQuincenal ?? estimarIngresoQuincenal(movs, hoy);
  const guardado = await repo.presupuesto(userId, 'q', rango.inicio).catch(() => null);
  const lineas = guardado?.lineas ?? proponerPresupuesto(movs, recurrentes, 'q', actual ? hoy : deISO(rango.fin), diasPago);
  const vs = presupuestoVsActual(lineas, movs, rango, ingreso, hoy);
  return armarDatosBot({ rango, periodoActual: actual, vs, recurrentes, movimientos: movs.length, hoy, diasPago });
}

export type RespuestaBot = { texto: string; origen: 'modelo' | 'reglas'; intencion: Intencion; descartada: number[] };

/**
 * Contesta una pregunta. Claude redacta con los datos; si su texto trae una cifra que no está en los datos,
 * se descarta y se manda la redacción fija. Así el bot nunca dice un número que la app no calculó.
 */
export async function responderPregunta(pregunta: string, datos: DatosBot): Promise<RespuestaBot> {
  const intencion = intencionDe(pregunta);
  const respaldo = respuestaDeReglas(intencion, datos, formatMXN);
  if (!datos.hayDatos || !hayLLM()) return { texto: respaldo, origen: 'reglas', intencion, descartada: [] };
  const texto = await redactarRespuestaBot(pregunta, datos);
  if (!texto) return { texto: respaldo, origen: 'reglas', intencion, descartada: [] };
  const inventadas = cifrasInventadas(texto, datos);
  if (inventadas.length) return { texto: respaldo, origen: 'reglas', intencion, descartada: inventadas };
  return { texto, origen: 'modelo', intencion, descartada: [] };
}
