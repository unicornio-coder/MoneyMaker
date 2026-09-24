// Conector Gmail (modo prueba: hasta 100 usuarios sin verificación de Google).
// Pide gmail.readonly, guarda el refresh token cifrado y lee solo correos de alerta de bancos conocidos.

import type { Repo } from '@/lib/data/repo';
import { infoBanco } from '@/lib/domain/comercios';
import { ingerirMovimientos } from './ingest';
import { parsearAlerta, type CorreoAlerta } from './gmail.parsers';
import { parsearRecibo, REMITENTES_RECIBOS, type Recibo } from './recibos';
import { aplicarRecibos } from './enriquecer';

const AUTH = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN = 'https://oauth2.googleapis.com/token';
const API = 'https://gmail.googleapis.com/gmail/v1/users/me';
export const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/userinfo.email'];

const REMITENTES = ['bbva.mx', 'bbva.com', 'americanexpress.com', 'nu.com.mx', 'banorte.com', 'santander.com.mx', 'hsbc.com.mx', 'banamex.com', 'scotiabank.com.mx'];

export function gmailConfigurado() {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function redirectUri() {
  return `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/gmail/callback`;
}

export function urlAutorizacion(state: string): string {
  const p = new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID!, redirect_uri: redirectUri(), response_type: 'code', scope: SCOPES.join(' '), access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true', state });
  return `${AUTH}?${p}`;
}

export async function intercambiarCodigo(code: string): Promise<{ refresh_token: string; access_token: string; email: string }> {
  const res = await fetch(TOKEN, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code, client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, redirect_uri: redirectUri(), grant_type: 'authorization_code' }) });
  if (!res.ok) throw new Error(`Google token: ${res.status}`);
  const t = (await res.json()) as { refresh_token?: string; access_token: string };
  if (!t.refresh_token) throw new Error('Google no devolvió refresh_token (revoca el acceso en tu cuenta de Google y vuelve a intentar).');
  const perfil = await fetch(`${API}/profile`, { headers: { Authorization: `Bearer ${t.access_token}` } }).then((r) => r.json() as Promise<{ emailAddress: string }>);
  return { refresh_token: t.refresh_token, access_token: t.access_token, email: perfil.emailAddress };
}

async function accessToken(refresh: string): Promise<string> {
  const res = await fetch(TOKEN, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ refresh_token: refresh, client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, grant_type: 'refresh_token' }) });
  if (!res.ok) throw new Error(`Google refresh: ${res.status}`);
  return ((await res.json()) as { access_token: string }).access_token;
}

function decodificarBase64Url(s: string): string {
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}

type Parte = { mimeType?: string; body?: { data?: string }; parts?: Parte[] };

function textoDe(payload: Parte): string {
  if (payload.body?.data && (payload.mimeType?.startsWith('text/plain') || !payload.parts)) {
    const raw = decodificarBase64Url(payload.body.data);
    return payload.mimeType?.startsWith('text/html') ? raw.replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&') : raw;
  }
  for (const p of payload.parts ?? []) {
    const t = textoDe(p);
    if (t.trim()) return t;
  }
  return '';
}

/** Lee alertas de los últimos `dias` días y las ingiere. Idempotente por hash y por id de mensaje. */
export async function sincronizarGmail(repo: Repo, userId: string, dias = 7): Promise<{ ok: boolean; insertados: number; leidos: number; enriquecidos?: number; error?: string }> {
  const cred = await repo.credencial(userId, 'gmail');
  const link = (await repo.links(userId)).find((l) => l.proveedor === 'gmail');
  if (!cred || !link) return { ok: false, insertados: 0, leidos: 0, error: 'Gmail no está conectado.' };
  try {
    const token = await accessToken(String(cred.datos.refresh_token));
    const procesados = new Set<string>((cred.datos.procesados as string[]) ?? []);
    const q = `newer_than:${dias}d (${[...REMITENTES, ...REMITENTES_RECIBOS].map((d) => `from:${d}`).join(' OR ')})`;
    const lista = await fetch(`${API}/messages?q=${encodeURIComponent(q)}&maxResults=200`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json() as Promise<{ messages?: { id: string }[] }>);
    const ids = (lista.messages ?? []).map((m) => m.id).filter((id) => !procesados.has(id));

    const recibos: Recibo[] = [];
    const porCuenta = new Map<string, { banco: string; tipoCuenta: 'credito' | 'debito'; ultimos4: string | null; movs: CorreoAlerta[]; parseados: ReturnType<typeof parsearAlerta>[] }>();
    for (const id of ids) {
      const msg = await fetch(`${API}/messages/${id}?format=full`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json() as Promise<{ payload: Parte & { headers: { name: string; value: string }[] }; internalDate: string }>);
      const h = (n: string) => msg.payload.headers.find((x) => x.name.toLowerCase() === n)?.value ?? '';
      const correo: CorreoAlerta = { from: h('from'), subject: h('subject'), text: textoDe(msg.payload).slice(0, 4000), fecha: new Date(Number(msg.internalDate)).toISOString() };
      procesados.add(id);
      const recibo = parsearRecibo(correo);
      if (recibo) {
        recibos.push(recibo);
        continue;
      }
      const p = parsearAlerta(correo);
      if (!p) continue;
      const k = `${p.banco}|${p.tipoCuenta}|${p.ultimos4 ?? ''}`;
      const g = porCuenta.get(k) ?? { banco: p.banco, tipoCuenta: p.tipoCuenta, ultimos4: p.ultimos4, movs: [], parseados: [] };
      g.parseados.push(p);
      porCuenta.set(k, g);
    }

    let insertados = 0;
    const cuentas = await repo.cuentas(userId);
    for (const g of porCuenta.values()) {
      const info = infoBanco(g.banco);
      let cuenta = cuentas.find((c) => c.banco === info.nombre && (!g.ultimos4 || c.ultimos4 === g.ultimos4)) ?? cuentas.find((c) => c.banco === info.nombre && c.tipo === g.tipoCuenta);
      if (!cuenta) {
        cuenta = await repo.guardarCuenta(userId, { linkId: link.id, externalId: `gmail:${info.nombre}:${g.ultimos4 ?? g.tipoCuenta}`, nombre: `${info.nombre} ${g.tipoCuenta === 'credito' ? 'Crédito' : 'Débito'}`, banco: info.nombre, bancoDominio: info.dominio || null, tipo: g.tipoCuenta, ultimos4: g.ultimos4, saldo: 0, color: info.color, activo: true });
        cuentas.push(cuenta);
      }
      const r = await ingerirMovimientos(repo, userId, cuenta, g.parseados.map((p) => p!.movimiento), 'gmail');
      insertados += r.insertados;
    }

    await repo.guardarCredencial(userId, { proveedor: 'gmail', etiqueta: cred.etiqueta, datos: { ...cred.datos, procesados: [...procesados].slice(-3000) } });
    // Recibos (Amazon, Uber, Rappi, Mercado Libre…): se casan con los cargos y escriben el detalle.
    const enriquecidos = await aplicarRecibos(repo, userId, recibos);
    await repo.guardarLink(userId, { ...link, estado: 'ok', ultimoSync: new Date().toISOString() });
    return { ok: true, insertados, leidos: ids.length, enriquecidos: enriquecidos.casados };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    await repo.guardarLink(userId, { ...link, estado: /401|403|invalid_grant/.test(error) ? 'roto' : link.estado });
    return { ok: false, insertados: 0, leidos: 0, error };
  }
}

export async function desconectarGmail(repo: Repo, userId: string) {
  const cred = await repo.credencial(userId, 'gmail');
  if (cred?.datos.refresh_token) await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(String(cred.datos.refresh_token))}`, { method: 'POST' }).catch(() => {});
  await repo.eliminarCredencial(userId, 'gmail');
  const link = (await repo.links(userId)).find((l) => l.proveedor === 'gmail');
  if (link) await repo.eliminarLink(userId, link.id);
}
