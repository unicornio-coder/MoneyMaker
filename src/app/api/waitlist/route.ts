import { NextResponse } from 'next/server';
import { MODO_MOCK } from '@/lib/supabase/env';
import { supabaseAdmin } from '@/lib/supabase/server';

/** Lista de espera de la landing. Sin sesión; guarda con el cliente de servicio. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { email?: string; origen?: string } | null;
  const email = String(body?.email ?? '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return NextResponse.json({ error: 'correo inválido' }, { status: 400 });
  if (MODO_MOCK) return NextResponse.json({ ok: true, modo: 'mock' });
  const { error } = await supabaseAdmin().from('waitlist').upsert({ email, origen: body?.origen ?? 'landing' }, { onConflict: 'email' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
