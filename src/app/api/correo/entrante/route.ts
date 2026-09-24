import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getRepo } from '@/lib/data';
import { MODO_MOCK } from '@/lib/supabase/env';
import { supabaseAdmin } from '@/lib/supabase/server';
import { repoSupabaseCon } from '@/lib/data/repo.supabase';
import { dominioCorreoEntrante, procesarEntrada, usuarioPorAlias } from '@/lib/services/entrada';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Webhook de correo entrante (Resend / Postmark / Cloudflare Email Workers): el usuario reenvía alertas y recibos a
 * `<alias>@<CORREO_ENTRANTE_DOMINIO>`. Se autentica con CORREO_ENTRANTE_SECRET (cabecera `x-correo-secreto` o
 * firma HMAC-SHA256 del cuerpo en `x-correo-firma`). El cuerpo del correo no se guarda.
 * JSON esperado (se aceptan los nombres de Resend y Postmark): { to|To, from|From, subject|Subject, text|TextBody, date|Date }.
 */
export async function POST(req: Request) {
  const secreto = process.env.CORREO_ENTRANTE_SECRET;
  if (!secreto) return NextResponse.json({ codigo: 'no_configurado' }, { status: 503 });
  const crudo = await req.text();
  const cabecera = req.headers.get('x-correo-secreto') ?? '';
  const firma = req.headers.get('x-correo-firma') ?? '';
  const esperada = createHmac('sha256', secreto).update(crudo).digest('hex');
  const okSecreto = cabecera.length === secreto.length && timingSafeEqual(Buffer.from(cabecera), Buffer.from(secreto));
  const okFirma = firma.length === esperada.length && timingSafeEqual(Buffer.from(firma), Buffer.from(esperada));
  if (!okSecreto && !okFirma) return NextResponse.json({ codigo: 'no_autorizado' }, { status: 401 });

  let b: Record<string, unknown>;
  try {
    b = JSON.parse(crudo) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ codigo: 'cuerpo_invalido' }, { status: 400 });
  }
  const campo = (...k: string[]) => k.map((x) => b[x]).find((v) => typeof v === 'string') as string | undefined;
  const para = campo('to', 'To', 'recipient') ?? (Array.isArray(b.to) ? String(b.to[0]) : '');
  const alias = /([a-z0-9-]+)@/i.exec(para ?? '')?.[1]?.toLowerCase() ?? '';
  const dominio = /@([a-z0-9.-]+)/i.exec(para ?? '')?.[1]?.toLowerCase();
  if (!alias || dominio !== dominioCorreoEntrante()) return NextResponse.json({ codigo: 'destinatario_invalido' }, { status: 400 });

  const repo = MODO_MOCK ? getRepo() : repoSupabaseCon(() => supabaseAdmin());
  const userId = await usuarioPorAlias(repo, alias);
  if (!userId) return NextResponse.json({ codigo: 'alias_desconocido' }, { status: 404 });

  const texto = campo('text', 'TextBody', 'text_body') ?? String(campo('html', 'HtmlBody') ?? '').replace(/<[^>]+>/g, ' ');
  const fechaCruda = campo('date', 'Date');
  const correo = { from: campo('from', 'From') ?? '', subject: campo('subject', 'Subject') ?? '', text: texto.slice(0, 8000), fecha: fechaCruda && !Number.isNaN(Date.parse(fechaCruda)) ? new Date(fechaCruda).toISOString() : new Date().toISOString() };
  const r = await procesarEntrada(repo, userId, correo, 'correo');
  return NextResponse.json({ ok: true, ...r });
}
