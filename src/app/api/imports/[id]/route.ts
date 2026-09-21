import { NextResponse } from 'next/server';
import { contexto } from '@/lib/data/contexto';
import { descartarImportacion } from '@/lib/services/importacion';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { usuario, repo } = await contexto();
  const importacion = await repo.importacion(usuario.id, params.id);
  if (!importacion) return NextResponse.json({ codigo: 'no_encontrada' }, { status: 404 });
  return NextResponse.json({ importacion });
}

/** Cancela o descarta una importación que no se ha confirmado. */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { usuario, repo } = await contexto();
  const ok = await descartarImportacion(repo, usuario.id, params.id);
  return NextResponse.json({ ok }, { status: ok ? 200 : 409 });
}
