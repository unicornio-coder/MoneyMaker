import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { repoSupabaseCon } from '@/lib/data/repo.supabase';
import { MODO_MOCK } from '@/lib/supabase/env';
import { correoConfigurado } from '@/lib/services/correo';
import { enviarResumenSemanal } from '@/lib/services/resumen';
import { incluye, nivelPlan } from '@/lib/domain/plan';
import { hoyMX } from '@/lib/domain/fechas';

export const runtime = 'nodejs';
export const maxDuration = 300;

/**
 * Resumen del domingo (vercel.json → domingos 14:00 UTC = 8:00 CDMX). Un correo por usuario con Plus que lo tenga
 * activado en Ajustes. Protegido con CRON_SECRET. Sin Resend responde sin hacer nada.
 */
export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: 'no autorizado' }, { status: 401 });
  if (MODO_MOCK) return NextResponse.json({ ok: true, modo: 'mock' });
  if (!correoConfigurado()) return NextResponse.json({ ok: true, enviados: 0, motivo: 'correo_no_configurado' });

  const admin = supabaseAdmin();
  const repo = repoSupabaseCon(() => admin);
  const { data: perfiles, error } = await admin.from('profiles').select('id').eq('resumen_domingo', true).eq('onboarding_completo', true);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const urlApp = process.env.NEXT_PUBLIC_APP_URL || 'https://money-maker-tawny.vercel.app';
  const hoy = hoyMX();
  let enviados = 0;
  let omitidos = 0;
  let fallos = 0;
  for (const p of perfiles ?? []) {
    try {
      const perfil = await repo.perfil(String(p.id));
      if (!perfil || !incluye(nivelPlan(perfil), 'reportes')) {
        omitidos++;
        continue;
      }
      const r = await enviarResumenSemanal(repo, perfil.id, perfil, hoy, urlApp);
      if (r.ok) enviados++;
      else if (r.error === 'sin_datos') omitidos++;
      else fallos++;
    } catch {
      fallos++;
    }
  }
  return NextResponse.json({ ok: true, usuarios: (perfiles ?? []).length, enviados, omitidos, fallos });
}
