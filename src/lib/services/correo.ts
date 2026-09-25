// Correo saliente vía Resend (REST). Sin RESEND_API_KEY no manda nada y devuelve `no_configurado`.
// Nunca se registra el cuerpo del correo ni datos personales en logs.

export type Adjunto = { nombre: string; contenido: Uint8Array | Buffer; tipo?: string };
export type Correo = { para: string | string[]; cc?: string | string[]; asunto: string; texto: string; html?: string; adjuntos?: Adjunto[]; responderA?: string };
export type ResultadoCorreo = { ok: true; id: string | null } | { ok: false; error: 'no_configurado' | 'rechazado' | 'red'; detalle?: string };

export function correoConfigurado(): boolean {
  return !!process.env.RESEND_API_KEY;
}

export function remitente(): string {
  return process.env.RESEND_REMITENTE || 'MoneyMaker <hola@moneymaker.mx>';
}

export async function enviarCorreo(c: Correo): Promise<ResultadoCorreo> {
  if (!correoConfigurado()) return { ok: false, error: 'no_configurado' };
  const cuerpo = {
    from: remitente(),
    to: Array.isArray(c.para) ? c.para : [c.para],
    cc: c.cc ? (Array.isArray(c.cc) ? c.cc : [c.cc]) : undefined,
    reply_to: c.responderA,
    subject: c.asunto,
    text: c.texto,
    html: c.html,
    attachments: c.adjuntos?.map((a) => ({ filename: a.nombre, content: Buffer.from(a.contenido).toString('base64'), content_type: a.tipo ?? 'application/pdf' })),
  };
  try {
    const res = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
    if (!res.ok) return { ok: false, error: 'rechazado', detalle: `Resend ${res.status}` };
    const data = (await res.json().catch(() => ({}))) as { id?: string };
    return { ok: true, id: data.id ?? null };
  } catch {
    return { ok: false, error: 'red' };
  }
}
