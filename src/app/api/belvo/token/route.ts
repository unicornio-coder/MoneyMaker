import { NextResponse } from 'next/server';
import { usuarioActual } from '@/lib/auth/session';
import { getAggregator } from '@/lib/services/aggregator';

/** Token de un solo uso para abrir el widget de Belvo en el cliente. */
export async function POST() {
  const usuario = await usuarioActual();
  const agg = getAggregator();
  if (agg.nombre !== 'belvo') return NextResponse.json({ error: 'Belvo no está configurado en el servidor (faltan BELVO_SECRET_ID / BELVO_SECRET_PASSWORD).' }, { status: 503 });
  try {
    const t = await agg.tokenWidget(usuario.id);
    return NextResponse.json({ access: t.access });
  } catch (e) {
    const mensaje = e instanceof Error ? e.message : 'error';
    console.error('[belvo] token del widget falló:', mensaje);
    return NextResponse.json({ error: mensaje }, { status: 502 });
  }
}
