import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { contexto } from '@/lib/data/contexto';
import { confirmarImportaciones, type ConfirmacionItem } from '@/lib/services/importacion';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const TIPOS = new Set(['credito', 'debito', 'inversion']);

/** POST JSON `{ items: [{ id, cuentaId?, institucion?, tipoCuenta?, ultimos4? }] }`: guarda todas las importaciones en revisión. */
export async function POST(req: Request) {
  const { usuario, repo } = await contexto();
  let body: { items?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ codigo: 'servidor' }, { status: 400 });
  }
  const crudos = Array.isArray(body.items) ? body.items : [];
  const items: ConfirmacionItem[] = crudos
    .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object' && typeof (x as { id?: unknown }).id === 'string')
    .slice(0, 10)
    .map((x) => ({
      id: String(x.id),
      cuentaId: typeof x.cuentaId === 'string' && x.cuentaId ? x.cuentaId : null,
      institucion: typeof x.institucion === 'string' && x.institucion.trim() ? x.institucion.trim().slice(0, 60) : null,
      tipoCuenta: typeof x.tipoCuenta === 'string' && TIPOS.has(x.tipoCuenta) ? (x.tipoCuenta as ConfirmacionItem['tipoCuenta']) : null,
      ultimos4: typeof x.ultimos4 === 'string' && /^\d{4}$/.test(x.ultimos4) ? x.ultimos4 : null,
    }));
  if (!items.length) return NextResponse.json({ codigo: 'servidor' }, { status: 400 });

  const r = await confirmarImportaciones(repo, usuario.id, items);
  for (const p of ['/app', '/app/gastos', '/app/fijos', '/app/presupuesto', '/app/insights', '/app/patrimonio', '/app/importar']) revalidatePath(p);
  return NextResponse.json(r);
}
