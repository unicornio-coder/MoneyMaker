import { NextResponse } from 'next/server';
import { contexto } from '@/lib/data/contexto';
import { actualizarMovimientosImportacion, descartarImportacion } from '@/lib/services/importacion';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET: estado actual (la UI lo consulta cada segundo y medio mientras está `procesando`). */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { usuario, repo } = await contexto();
  const importacion = await repo.importacion(usuario.id, params.id);
  if (!importacion) return NextResponse.json({ codigo: 'no_encontrada' }, { status: 404 });
  return NextResponse.json({ importacion }, { headers: { 'cache-control': 'no-store' } });
}

/** PATCH JSON `{ movimientos: [...] }`: cambios del usuario en la tabla de revisión, antes de confirmar. */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { usuario, repo } = await contexto();
  let body: { movimientos?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ codigo: 'servidor' }, { status: 400 });
  }
  const importacion = await actualizarMovimientosImportacion(repo, usuario.id, params.id, body.movimientos);
  if (!importacion) return NextResponse.json({ codigo: 'no_editable' }, { status: 409 });
  return NextResponse.json({ importacion });
}

/** Cancela o descarta una importación que no se ha confirmado. */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { usuario, repo } = await contexto();
  const ok = await descartarImportacion(repo, usuario.id, params.id);
  return NextResponse.json({ ok }, { status: ok ? 200 : 409 });
}
