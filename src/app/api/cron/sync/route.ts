import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { repoSupabaseCon } from '@/lib/data/repo.supabase';
import { sincronizarLink } from '@/lib/services/conectar';
import { sincronizarGmail } from '@/lib/services/gmail';
import { sincronizarOutlook } from '@/lib/services/outlook';
import { sincronizarBitso } from '@/lib/services/bitso';
import { MODO_MOCK } from '@/lib/supabase/env';

export const runtime = 'nodejs';
export const maxDuration = 300;

/**
 * Cron diario (Vercel: vercel.json → 12:00 UTC = 6:00 CDMX). Sincroniza todos los links automáticos de todos
 * los usuarios con el cliente de servicio. Protegido con CRON_SECRET (Vercel lo manda como Bearer).
 */
export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: 'no autorizado' }, { status: 401 });
  if (MODO_MOCK) return NextResponse.json({ ok: true, modo: 'mock' });

  const admin = supabaseAdmin();
  const repo = repoSupabaseCon(() => admin);
  const { data: links, error } = await admin.from('links').select('id,user_id,proveedor,external_id,estado').in('proveedor', ['belvo', 'gmail', 'bitso']).neq('estado', 'roto');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let ok = 0;
  let fallos = 0;
  for (const l of links ?? []) {
    const userId = String(l.user_id);
    try {
      let r: { ok: boolean };
      if (l.proveedor === 'belvo' && l.external_id) r = await sincronizarLink(repo, userId, String(l.id), String(l.external_id), 'belvo', 2);
      else if (l.proveedor === 'gmail') r = await sincronizarGmail(repo, userId);
      else if (l.proveedor === 'outlook') r = await sincronizarOutlook(repo, userId);
      else if (l.proveedor === 'bitso') r = await sincronizarBitso(repo, userId);
      else continue;
      if (r.ok) ok++;
      else fallos++;
    } catch {
      fallos++;
    }
  }
  return NextResponse.json({ ok: true, links: (links ?? []).length, sincronizados: ok, fallos });
}
