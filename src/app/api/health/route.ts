import { NextResponse } from 'next/server';
import { MODO_MOCK } from '@/lib/supabase/env';
import { hayLLM } from '@/lib/services/llm';
import { supabaseAdmin } from '@/lib/supabase/server';

/** true si la base responde (o en mock); false si Supabase está pausado o caído. */
async function baseDeDatosOk(): Promise<boolean> {
  if (MODO_MOCK) return true;
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return false;
  try {
    const { error } = await supabaseAdmin().from('profiles').select('id', { count: 'exact', head: true }).limit(1);
    return !error;
  } catch {
    return false;
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Salud del despliegue para monitoreo externo (sin datos de usuario): versión, build, modo y qué integraciones
 * están configuradas. Responde 200 siempre que la función arranque.
 */
export async function GET() {
  const db = await baseDeDatosOk();
  return NextResponse.json(
    {
      ok: true,
      version: process.env.NEXT_PUBLIC_APP_VERSION ?? null,
      build: (process.env.VERCEL_GIT_COMMIT_SHA ?? '').slice(0, 7) || null,
      modo: MODO_MOCK ? 'mock' : 'supabase',
      db,
      integraciones: { modelo: hayLLM(), stripe: !!process.env.STRIPE_SECRET_KEY, belvo: !!process.env.BELVO_SECRET_ID, gmail: !!process.env.GOOGLE_CLIENT_ID, outlook: !!process.env.MS_CLIENT_ID, correo: !!process.env.RESEND_API_KEY, push: !!process.env.VAPID_PRIVATE_KEY },
      hora: new Date().toISOString(),
    },
    { headers: { 'cache-control': 'no-store' } },
  );
}
