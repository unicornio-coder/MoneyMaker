import { NextResponse } from 'next/server';
import { registrarError } from '@/lib/server/errores';
import { ipDe, limitarPeticion, LIMITES, respuesta429 } from '@/lib/server/ratelimit';

export const runtime = 'nodejs';

/** Errores que ven las pantallas de error del cliente. Sin sesión (puede fallar antes de entrar); limitado por IP. */
export async function POST(req: Request) {
  const l = limitarPeticion(`errores:${ipDe(req)}`, LIMITES.errores);
  if (!l.ok) return respuesta429(l);
  const b = (await req.json().catch(() => null)) as { mensaje?: unknown; digest?: unknown; ruta?: unknown; contexto?: unknown } | null;
  if (!b || typeof b.mensaje !== 'string') return NextResponse.json({ error: 'sin_mensaje' }, { status: 400 });
  await registrarError({ contexto: typeof b.contexto === 'string' ? `cliente:${b.contexto}` : 'cliente', mensaje: b.mensaje, digest: typeof b.digest === 'string' ? b.digest : null, ruta: typeof b.ruta === 'string' ? b.ruta : null });
  return NextResponse.json({ ok: true });
}
