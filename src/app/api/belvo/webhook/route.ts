import { NextResponse } from 'next/server';
import { webhookAutorizado } from '@/lib/services/belvo';
import { sincronizarLink } from '@/lib/services/conectar';
import { supabaseAdmin } from '@/lib/supabase/server';
import { repoSupabaseCon } from '@/lib/data/repo.supabase';

/**
 * Webhooks de Belvo: historical_update / new_transactions_available / refresh_needed (MFA).
 * Se autentica con el secreto configurado en el dashboard. Usa el cliente de servicio porque no hay sesión.
 */
export async function POST(req: Request) {
  if (!webhookAutorizado(req)) return NextResponse.json({ error: 'no autorizado' }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { webhook_type?: string; webhook_code?: string; link_id?: string; external_id?: string } | null;
  if (!body?.link_id) return NextResponse.json({ ok: true });

  const admin = supabaseAdmin();
  const { data: link } = await admin.from('links').select('id,user_id,institucion').eq('proveedor', 'belvo').eq('external_id', body.link_id).maybeSingle();
  if (!link) return NextResponse.json({ ok: true, ignorado: 'link desconocido' });

  const repo = repoSupabaseCon(() => admin);
  const code = (body.webhook_code ?? '').toLowerCase();
  if (code.includes('refresh_needed') || code.includes('mfa')) {
    await admin.from('links').update({ estado: 'mfa' }).eq('id', link.id);
    return NextResponse.json({ ok: true });
  }
  const r = await sincronizarLink(repo, String(link.user_id), String(link.id), body.link_id, 'belvo', code.includes('historical') ? 12 : 2);
  return NextResponse.json({ ok: r.ok });
}
