import { NextResponse } from 'next/server';
import { usuarioActual } from '@/lib/auth/session';
import { getAggregator } from '@/lib/services/aggregator';

/**
 * Token de un solo uso para abrir el widget de Belvo en el cliente. Antes de darlo revisa que la cuenta de Belvo
 * tenga bancos habilitados: si solo tiene SAT e IMSS, el widget no serviría para conectar una cuenta bancaria y es
 * mejor decirlo claro (409) que abrir una lista sin bancos.
 */
export async function POST() {
  const usuario = await usuarioActual();
  const agg = getAggregator();
  if (agg.nombre !== 'belvo') return NextResponse.json({ error: 'Belvo no está configurado en el servidor (faltan BELVO_SECRET_ID / BELVO_SECRET_PASSWORD).' }, { status: 503 });
  let bancos: number | null = null;
  try {
    const d = await agg.diagnostico();
    bancos = d.bancos.length;
    if (!d.hayBancos) return NextResponse.json({ error: d.mensaje, sinBancos: true, bancos: 0 }, { status: 409 });
  } catch (e) {
    // Si la lista falla, no bloqueamos: el widget mostrará lo que Belvo permita.
    console.error('[belvo] no se pudo diagnosticar instituciones:', e instanceof Error ? e.message : e);
  }
  try {
    const t = await agg.tokenWidget(usuario.id);
    return NextResponse.json({ access: t.access, bancos });
  } catch (e) {
    const mensaje = e instanceof Error ? e.message : 'error';
    console.error('[belvo] token del widget falló:', mensaje);
    return NextResponse.json({ error: mensaje }, { status: 502 });
  }
}
