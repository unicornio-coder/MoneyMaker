import { NextResponse } from 'next/server';
import { getRepo } from '@/lib/data';
import { MODO_MOCK } from '@/lib/supabase/env';
import { supabaseAdmin } from '@/lib/supabase/server';
import { repoSupabaseCon } from '@/lib/data/repo.supabase';
import { notificacionACorreo, procesarEntrada, usuarioPorToken, type Notificacion } from '@/lib/services/entrada';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST desde la app Android (NotificationListenerService). Authorization: Bearer <token de dispositivo>.
 * Cuerpo: { notificaciones: [{ paquete, titulo, texto, hora }] } (máximo 50). Nunca se guarda el texto: solo el
 * movimiento o el detalle que sale del parser. Responde cuántas se convirtieron en movimiento o recibo.
 */
export async function POST(req: Request) {
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return NextResponse.json({ codigo: 'sin_token' }, { status: 401 });
  const repo = MODO_MOCK ? getRepo() : repoSupabaseCon(() => supabaseAdmin());
  const userId = await usuarioPorToken(repo, token);
  if (!userId) return NextResponse.json({ codigo: 'token_invalido' }, { status: 401 });

  let body: { notificaciones?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ codigo: 'cuerpo_invalido' }, { status: 400 });
  }
  const lista = (Array.isArray(body.notificaciones) ? body.notificaciones : []).slice(0, 50) as Notificacion[];
  const resumen = { movimientos: 0, duplicados: 0, recibos: 0, ignoradas: 0 };
  for (const n of lista) {
    if (!n || typeof n.paquete !== 'string' || typeof n.texto !== 'string') {
      resumen.ignoradas++;
      continue;
    }
    const correo = notificacionACorreo({ paquete: n.paquete, titulo: String(n.titulo ?? ''), texto: n.texto, hora: n.hora ?? null });
    if (!correo) {
      resumen.ignoradas++;
      continue;
    }
    const r = await procesarEntrada(repo, userId, correo, 'dispositivo').catch(() => ({ tipo: 'ignorado' as const, motivo: 'error' }));
    if (r.tipo === 'movimiento') {
      resumen.movimientos += r.insertados;
      resumen.duplicados += r.duplicados;
    } else if (r.tipo === 'recibo') resumen.recibos += r.casados;
    else resumen.ignoradas++;
  }
  return NextResponse.json({ ok: true, ...resumen });
}
