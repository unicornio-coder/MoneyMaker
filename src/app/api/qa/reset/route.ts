import { NextResponse } from 'next/server';
import { MODO_MOCK } from '@/lib/supabase/env';
import { reiniciarMemoria } from '@/lib/data/repo.memoria';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Solo en modo demo (sin Supabase): borra el estado en memoria para que las pruebas E2E arranquen limpias. */
export async function POST() {
  if (!MODO_MOCK) return NextResponse.json({ error: 'No disponible' }, { status: 404 });
  reiniciarMemoria();
  return NextResponse.json({ ok: true });
}
