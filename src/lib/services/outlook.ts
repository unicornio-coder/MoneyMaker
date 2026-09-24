// Conector Outlook / Hotmail (Microsoft Graph). Pide Mail.Read + offline_access, guarda el refresh token
// y lee solo correos de bancos y comercios conocidos. Mismo pipeline que Gmail (buzon.ts).

import type { Repo } from '@/lib/data/repo';
import type { CorreoAlerta } from './gmail.parsers';
import { ingerirCorreos, limpiarHtml, remitenteRelevante } from './buzon';

const AUTH = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
const TOKEN = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
const API = 'https://graph.microsoft.com/v1.0/me';
export const SCOPES = ['offline_access', 'User.Read', 'Mail.Read'];

export function outlookConfigurado() {
  return !!(process.env.MS_CLIENT_ID && process.env.MS_CLIENT_SECRET);
}

function redirectUri() {
  return `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/outlook/callback`;
}

export function urlAutorizacionOutlook(state: string): string {
  const p = new URLSearchParams({ client_id: process.env.MS_CLIENT_ID!, redirect_uri: redirectUri(), response_type: 'code', response_mode: 'query', scope: SCOPES.join(' '), prompt: 'select_account', state });
  return `${AUTH}?${p}`;
}

type Tokens = { access_token: string; refresh_token?: string };

async function pedirToken(body: Record<string, string>): Promise<Tokens> {
  const res = await fetch(TOKEN, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: process.env.MS_CLIENT_ID!, client_secret: process.env.MS_CLIENT_SECRET!, scope: SCOPES.join(' '), ...body }) });
  if (!res.ok) throw new Error(`Microsoft token: ${res.status}`);
  return (await res.json()) as Tokens;
}

export async function intercambiarCodigoOutlook(code: string): Promise<{ refresh_token: string; email: string }> {
  const t = await pedirToken({ code, redirect_uri: redirectUri(), grant_type: 'authorization_code' });
  if (!t.refresh_token) throw new Error('Microsoft no devolvió refresh_token.');
  const yo = await fetch(API, { headers: { Authorization: `Bearer ${t.access_token}` } }).then((r) => r.json() as Promise<{ mail?: string | null; userPrincipalName?: string }>);
  return { refresh_token: t.refresh_token, email: (yo.mail || yo.userPrincipalName || '').toLowerCase() };
}

async function accessToken(refresh: string): Promise<{ access: string; refresh: string }> {
  const t = await pedirToken({ refresh_token: refresh, grant_type: 'refresh_token' });
  return { access: t.access_token, refresh: t.refresh_token ?? refresh };
}

type MensajeGraph = { id: string; subject?: string; receivedDateTime: string; from?: { emailAddress?: { name?: string; address?: string } }; body?: { contentType?: string; content?: string }; bodyPreview?: string };

/** Descarga los mensajes de los últimos `dias` días (paginado) y se queda solo con remitentes que leemos. */
async function descargar(token: string, dias: number, saltar: Set<string>): Promise<{ correos: CorreoAlerta[]; ids: string[] }> {
  const desde = new Date(Date.now() - dias * 86_400_000).toISOString();
  const params = new URLSearchParams({ $filter: `receivedDateTime ge ${desde}`, $orderby: 'receivedDateTime desc', $select: 'id,subject,receivedDateTime,from,body,bodyPreview', $top: '100' });
  let url: string | null = `${API}/messages?${params}`;
  const correos: CorreoAlerta[] = [];
  const ids: string[] = [];
  for (let pagina = 0; url && pagina < 10; pagina++) {
    const res: Response = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Prefer: 'outlook.body-content-type="text"' } });
    if (!res.ok) throw new Error(`Graph messages: ${res.status}`);
    const data = (await res.json()) as { value: MensajeGraph[]; '@odata.nextLink'?: string };
    for (const m of data.value) {
      if (saltar.has(m.id)) continue;
      const from = `${m.from?.emailAddress?.name ?? ''} <${m.from?.emailAddress?.address ?? ''}>`;
      if (!remitenteRelevante(from)) continue;
      const cuerpo = m.body?.content ?? m.bodyPreview ?? '';
      const text = (m.body?.contentType === 'html' ? limpiarHtml(cuerpo) : cuerpo).slice(0, 4000);
      correos.push({ from, subject: m.subject ?? '', text, fecha: new Date(m.receivedDateTime).toISOString() });
      ids.push(m.id);
    }
    url = data['@odata.nextLink'] ?? null;
  }
  return { correos, ids };
}

/** Lee alertas y recibos de los últimos `dias` días y los ingiere. Idempotente por id de mensaje y por hash. */
export async function sincronizarOutlook(repo: Repo, userId: string, dias = 7): Promise<{ ok: boolean; insertados: number; leidos: number; enriquecidos?: number; error?: string }> {
  const cred = await repo.credencial(userId, 'outlook');
  const link = (await repo.links(userId)).find((l) => l.proveedor === 'outlook');
  if (!cred || !link) return { ok: false, insertados: 0, leidos: 0, error: 'Outlook no está conectado.' };
  try {
    const t = await accessToken(String(cred.datos.refresh_token));
    const procesados = new Set<string>((cred.datos.procesados as string[]) ?? []);
    const { correos, ids } = await descargar(t.access, dias, procesados);
    const r = await ingerirCorreos(repo, userId, link, correos, 'outlook');
    for (const id of ids) procesados.add(id);
    await repo.guardarCredencial(userId, { proveedor: 'outlook', etiqueta: cred.etiqueta, datos: { ...cred.datos, refresh_token: t.refresh, procesados: [...procesados].slice(-3000) } });
    await repo.guardarLink(userId, { ...link, estado: 'ok', ultimoSync: new Date().toISOString() });
    return { ok: true, insertados: r.insertados, leidos: ids.length, enriquecidos: r.recibos };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    await repo.guardarLink(userId, { ...link, estado: /401|403|invalid_grant/.test(error) ? 'roto' : link.estado });
    return { ok: false, insertados: 0, leidos: 0, error };
  }
}

/** Microsoft no expone revocación por API: se borra la credencial y el usuario puede retirar el permiso en su cuenta. */
export async function desconectarOutlook(repo: Repo, userId: string) {
  await repo.eliminarCredencial(userId, 'outlook');
  const link = (await repo.links(userId)).find((l) => l.proveedor === 'outlook');
  if (link) await repo.eliminarLink(userId, link.id);
}
