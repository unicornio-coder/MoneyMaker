// Web Push (VAPID) para la PWA: avisos de cobros próximos. Sin llaves no manda nada y devuelve `no_configurado`.
// Solo se guarda el endpoint y las llaves de la suscripción; nunca contenido financiero en logs.

import webpush from 'web-push';

export type SuscripcionPush = { endpoint: string; p256dh: string; auth: string };
export type CargaPush = { titulo: string; cuerpo: string; url?: string; etiqueta?: string };
export type ResultadoPush = { ok: true } | { ok: false; error: 'no_configurado' | 'caducada' | 'rechazado' | 'red' };

export function pushConfigurado(): boolean {
  return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

let listo = false;
function preparar() {
  if (listo) return;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:hola@moneymaker.mx', process.env.VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
  listo = true;
}

/** Manda una notificación. `caducada` (404/410) significa que hay que borrar la suscripción. */
export async function enviarPush(s: SuscripcionPush, carga: CargaPush): Promise<ResultadoPush> {
  if (!pushConfigurado()) return { ok: false, error: 'no_configurado' };
  preparar();
  try {
    await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(carga), { TTL: 60 * 60 * 12 });
    return { ok: true };
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) return { ok: false, error: 'caducada' };
    if (status && status >= 400 && status < 500) return { ok: false, error: 'rechazado' };
    return { ok: false, error: 'red' };
  }
}
