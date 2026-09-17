import { NextResponse } from 'next/server';
import { usuarioActual } from '@/lib/auth/session';
import { getAggregator } from '@/lib/services/aggregator';

/** Token de un solo uso para abrir el widget de Belvo en el cliente. */
export async function POST() {
  const usuario = await usuarioActual();
  try {
    const t = await getAggregator().tokenWidget(usuario.id);
    return NextResponse.json({ access: t.access });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'error' }, { status: 502 });
  }
}
