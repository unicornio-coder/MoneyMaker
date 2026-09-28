import { NextResponse } from 'next/server';
import { contexto } from '@/lib/data/contexto';
import { pushConfigurado } from '@/lib/services/push';

export const runtime = 'nodejs';

const esUrl = (v: unknown): v is string => typeof v === 'string' && /^https:\/\//.test(v) && v.length < 2048;
const esClave = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length < 512;

/** Registra la suscripción push de este dispositivo (la crea el navegador con la llave pública VAPID). */
export async function POST(req: Request) {
  if (!pushConfigurado()) return NextResponse.json({ error: 'no_configurado' }, { status: 503 });
  const { usuario, repo } = await contexto();
  const b = (await req.json().catch(() => null)) as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } | null;
  if (!b || !esUrl(b.endpoint) || !esClave(b.keys?.p256dh) || !esClave(b.keys?.auth)) return NextResponse.json({ error: 'suscripcion_invalida' }, { status: 400 });
  await repo.guardarSuscripcionPush(usuario.id, { endpoint: b.endpoint, p256dh: b.keys.p256dh, auth: b.keys.auth, agente: (req.headers.get('user-agent') ?? '').slice(0, 200) || null });
  return NextResponse.json({ ok: true });
}

/** Da de baja este dispositivo. */
export async function DELETE(req: Request) {
  const { usuario, repo } = await contexto();
  const b = (await req.json().catch(() => null)) as { endpoint?: unknown } | null;
  if (!b || !esUrl(b.endpoint)) return NextResponse.json({ error: 'suscripcion_invalida' }, { status: 400 });
  await repo.eliminarSuscripcionPush(usuario.id, b.endpoint);
  return NextResponse.json({ ok: true });
}
