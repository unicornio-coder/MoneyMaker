import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { repoSupabaseCon } from '@/lib/data/repo.supabase';
import { MODO_MOCK } from '@/lib/supabase/env';
import { enviarPush, pushConfigurado } from '@/lib/services/push';
import { avisosDeCobros, textoAvisos } from '@/lib/domain/resumen';
import { incluye, nivelPlan } from '@/lib/domain/plan';
import { hoyMX, aISO } from '@/lib/domain/fechas';
import { formatMXN } from '@/lib/format';

export const runtime = 'nodejs';
export const maxDuration = 300;

/**
 * Avisos de cobros próximos (vercel.json → diario 13:00 UTC = 7:00 CDMX): un push por usuario con Plus, avisos
 * activados y al menos un dispositivo, cuando un cargo fijo cae mañana o en 3 días. Suscripciones caducadas se borran.
 */
export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: 'no autorizado' }, { status: 401 });
  if (MODO_MOCK) return NextResponse.json({ ok: true, modo: 'mock' });
  if (!pushConfigurado()) return NextResponse.json({ ok: true, enviados: 0, motivo: 'push_no_configurado' });

  const admin = supabaseAdmin();
  const repo = repoSupabaseCon(() => admin);
  const { data: subs, error } = await admin.from('push_subscriptions').select('user_id');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const usuarios = Array.from(new Set((subs ?? []).map((s) => String(s.user_id))));
  const hoy = hoyMX();
  let enviados = 0;
  let caducadas = 0;
  let fallos = 0;
  for (const userId of usuarios) {
    try {
      const perfil = await repo.perfil(userId);
      if (!perfil || perfil.avisosCobros === false || !incluye(nivelPlan(perfil), 'reportes')) continue;
      const avisos = avisosDeCobros(await repo.recurrentes(userId), hoy);
      if (!avisos.length) continue;
      const carga = { titulo: avisos.length === 1 ? 'Cobro próximo' : `${avisos.length} cobros próximos`, cuerpo: textoAvisos(avisos, formatMXN), url: '/app/fijos?vista=cal', etiqueta: `cobros-${aISO(hoy)}` };
      for (const s of await repo.suscripcionesPush(userId)) {
        const r = await enviarPush(s, carga);
        if (r.ok) enviados++;
        else if (r.error === 'caducada') {
          caducadas++;
          await repo.eliminarSuscripcionPush(userId, s.endpoint);
        } else fallos++;
      }
    } catch {
      fallos++;
    }
  }
  return NextResponse.json({ ok: true, usuarios: usuarios.length, enviados, caducadas, fallos });
}
