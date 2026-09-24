import { NextResponse } from 'next/server';
import { MODO_MOCK } from '@/lib/supabase/env';
import { hayLLM } from '@/lib/services/llm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Salud del despliegue para monitoreo externo (sin datos de usuario): versión, build, modo y qué integraciones
 * están configuradas. Responde 200 siempre que la función arranque.
 */
export function GET() {
  return NextResponse.json(
    {
      ok: true,
      version: process.env.NEXT_PUBLIC_APP_VERSION ?? null,
      build: (process.env.VERCEL_GIT_COMMIT_SHA ?? '').slice(0, 7) || null,
      modo: MODO_MOCK ? 'mock' : 'supabase',
      integraciones: { modelo: hayLLM(), stripe: !!process.env.STRIPE_SECRET_KEY, belvo: !!process.env.BELVO_SECRET_ID, gmail: !!process.env.GOOGLE_CLIENT_ID, outlook: !!process.env.MS_CLIENT_ID },
      hora: new Date().toISOString(),
    },
    { headers: { 'cache-control': 'no-store' } },
  );
}
