import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { repoSupabaseCon } from '@/lib/data/repo.supabase';
import { MODO_MOCK } from '@/lib/supabase/env';
import { correoConfigurado } from '@/lib/services/correo';
import { enviarConectaBanco } from '@/lib/services/correosAuto';
import { registrar } from '@/lib/services/analytics';
import { registrarExcepcion } from '@/lib/server/errores';
import { GET as avisos } from '../avisos/route';

export const runtime = 'nodejs';
export const maxDuration = 300;

/**
 * Mantenimiento diario (vercel.json → 13:00 UTC = 7:00 CDMX), un solo cron para caber en el plan Hobby:
 * 1) avisos push de cobros próximos; 2) correo "conecta tu banco" a quien terminó el onboarding hace 2 días o más y
 * sigue sin fuentes (una sola vez por usuario, registrado como evento `correo_conecta`).
 */
export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: 'no autorizado' }, { status: 401 });
  if (MODO_MOCK) return NextResponse.json({ ok: true, modo: 'mock' });

  const resAvisos = await avisos(req).then((r) => r.json()).catch(() => ({ error: 'avisos' }));

  let correos = 0;
  let omitidos = 0;
  if (correoConfigurado()) {
    const admin = supabaseAdmin();
    const repo = repoSupabaseCon(() => admin);
    const hace2d = new Date(Date.now() - 2 * 86_400_000).toISOString();
    const { data: perfiles } = await admin.from('profiles').select('id,email,nombre').eq('onboarding_completo', true).lt('created_at', hace2d).limit(500);
    const urlApp = process.env.NEXT_PUBLIC_APP_URL || 'https://money-maker-tawny.vercel.app';
    for (const p of perfiles ?? []) {
      const userId = String(p.id);
      try {
        const [{ count: links }, { count: ya }] = await Promise.all([
          admin.from('links').select('id', { count: 'exact', head: true }).eq('user_id', userId),
          admin.from('events').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('nombre', 'correo_conecta'),
        ]);
        if ((links ?? 0) > 0 || (ya ?? 0) > 0) {
          omitidos++;
          continue;
        }
        const r = await enviarConectaBanco({ email: String(p.email), nombre: p.nombre ? String(p.nombre) : null }, urlApp);
        if (r.ok) {
          await registrar(repo, userId, 'correo_conecta');
          correos++;
        }
      } catch (e) {
        await registrarExcepcion('cron/diario', e, { userId });
      }
    }
  }
  return NextResponse.json({ ok: true, avisos: resAvisos, correos, omitidos });
}
