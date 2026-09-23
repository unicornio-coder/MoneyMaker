import { NextResponse } from 'next/server';
import { contexto } from '@/lib/data/contexto';
import { normalizar } from '@/lib/domain/categorizar';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET ?q=: movimientos cuyo comercio o descripción contiene el texto (últimos 13 meses, máximo 8). */
export async function GET(req: Request) {
  const q = normalizar(new URL(req.url).searchParams.get('q') ?? '').trim();
  if (q.length < 2) return NextResponse.json({ movimientos: [] });
  const { usuario, repo } = await contexto();
  const [movs, cuentas] = await Promise.all([repo.movimientos(usuario.id), repo.cuentas(usuario.id)]);
  const nombre = new Map(cuentas.map((c) => [c.id, c.nombre]));
  const movimientos = movs
    .filter((m) => normalizar(m.comercio).includes(q) || normalizar(m.descripcionRaw).includes(q))
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .slice(0, 8)
    .map((m) => ({ id: m.id, fecha: m.fecha, comercio: m.comercio, comercioDominio: m.comercioDominio, monto: m.monto, tipo: m.tipo, cuentaId: m.cuentaId, cuenta: nombre.get(m.cuentaId) ?? '' }));
  return NextResponse.json({ movimientos });
}
