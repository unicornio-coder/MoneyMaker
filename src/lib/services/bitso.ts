// Conector Bitso con llaves de API de solo lectura (HMAC-SHA256). Balances → posiciones valuadas en MXN;
// fondeos y retiros del ledger → movimientos de la cuenta de inversión.

import { createHmac } from 'node:crypto';
import type { Repo } from '@/lib/data/repo';
import type { MovimientoCrudo } from '@/lib/domain/tipos';
import { ingerirMovimientos } from './ingest';

const BASE = 'https://api.bitso.com';

export function firmar(key: string, secret: string, method: 'GET' | 'POST', path: string, body = '', nonce = Date.now()): string {
  const sig = createHmac('sha256', secret).update(`${nonce}${method}${path}${body}`).digest('hex');
  return `Bitso ${key}:${nonce}:${sig}`;
}

async function privado<T>(key: string, secret: string, path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: { Authorization: firmar(key, secret, 'GET', path) }, cache: 'no-store' });
  const json = (await res.json()) as { success: boolean; payload: T; error?: { message: string } };
  if (!res.ok || !json.success) throw new Error(json.error?.message ?? `Bitso ${res.status}`);
  return json.payload;
}

async function precioMxn(moneda: string): Promise<number> {
  if (moneda === 'mxn') return 1;
  const res = await fetch(`${BASE}/v3/ticker/?book=${moneda}_mxn`, { cache: 'no-store' });
  if (!res.ok) return 0;
  const json = (await res.json()) as { success: boolean; payload?: { last: string } };
  return json.success && json.payload ? Number(json.payload.last) : 0;
}

export type PosicionBitso = { ticker: string; nombre: string; dominio: string; cantidad: number; valor: number; variacion: number };

const NOMBRES: Record<string, [string, string]> = { btc: ['Bitcoin', 'bitcoin.org'], eth: ['Ethereum', 'ethereum.org'], sol: ['Solana', 'solana.com'], usdt: ['Tether', 'tether.to'], usdc: ['USD Coin', 'circle.com'], xrp: ['XRP', 'xrp.org'], ada: ['Cardano', 'cardano.org'], doge: ['Dogecoin', 'dogecoin.com'], mxn: ['Pesos', ''] };

/** Prueba las llaves: devuelve el saldo total en MXN o lanza error. */
export async function probarLlaves(key: string, secret: string): Promise<{ total: number; posiciones: PosicionBitso[] }> {
  const { balances } = await privado<{ balances: { currency: string; total: string }[] }>(key, secret, '/v3/balance/');
  const posiciones: PosicionBitso[] = [];
  for (const b of balances) {
    const cantidad = Number(b.total);
    if (!(cantidad > 0)) continue;
    const precio = await precioMxn(b.currency);
    const [nombre, dominio] = NOMBRES[b.currency] ?? [b.currency.toUpperCase(), ''];
    posiciones.push({ ticker: b.currency.toUpperCase(), nombre, dominio, cantidad, valor: cantidad * precio, variacion: 0 });
  }
  posiciones.sort((a, b) => b.valor - a.valor);
  return { total: posiciones.reduce((s, p) => s + p.valor, 0), posiciones };
}

export async function conectarBitso(repo: Repo, userId: string, key: string, secret: string): Promise<{ ok: true; total: number } | { ok: false; error: string }> {
  try {
    const { total, posiciones } = await probarLlaves(key.trim(), secret.trim());
    await repo.guardarCredencial(userId, { proveedor: 'bitso', etiqueta: `Bitso ${key.slice(0, 4)}…`, datos: { key: key.trim(), secret: secret.trim(), posiciones } });
    await repo.guardarLink(userId, { proveedor: 'bitso', externalId: 'bitso', institucion: 'Bitso', institucionDominio: 'bitso.com', estado: 'ok', ultimoSync: new Date().toISOString() });
    await sincronizarBitso(repo, userId);
    return { ok: true, total };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'No pudimos conectar con Bitso.' };
  }
}

export async function sincronizarBitso(repo: Repo, userId: string): Promise<{ ok: boolean; insertados: number; error?: string }> {
  const cred = await repo.credencial(userId, 'bitso');
  const link = (await repo.links(userId)).find((l) => l.proveedor === 'bitso');
  if (!cred || !link) return { ok: false, insertados: 0, error: 'Bitso no está conectado.' };
  const key = String(cred.datos.key);
  const secret = String(cred.datos.secret);
  try {
    const { total, posiciones } = await probarLlaves(key, secret);
    const cuenta = await repo.guardarCuenta(userId, { linkId: link.id, externalId: 'bitso', nombre: 'Bitso', banco: 'Bitso', bancoDominio: 'bitso.com', tipo: 'inversion', saldo: Math.round(total), color: '#16A34A', activo: true });
    // Ledger: fondeos y retiros (flujo de dinero). Los trades son internos y no cuentan como gasto.
    const ledger = await privado<{ eid: string; operation: string; created_at: string; balance_updates: { currency: string; amount: string }[]; details?: { method_name?: string } }[]>(key, secret, '/v3/ledger/?limit=100');
    const crudos: MovimientoCrudo[] = [];
    for (const e of ledger) {
      if (e.operation !== 'funding' && e.operation !== 'withdrawal') continue;
      const mxn = e.balance_updates.find((b) => b.currency === 'mxn');
      const monto = mxn ? Math.abs(Number(mxn.amount)) : 0;
      if (!(monto > 0)) continue;
      crudos.push({ externalId: e.eid, fecha: e.created_at.slice(0, 10), descripcion: e.operation === 'funding' ? `Aportación${e.details?.method_name ? ` ${e.details.method_name}` : ''}` : 'Retiro Bitso', monto, esAbono: e.operation === 'withdrawal' ? false : false });
    }
    const r = await ingerirMovimientos(repo, userId, cuenta, crudos, 'bitso');
    await repo.guardarCredencial(userId, { proveedor: 'bitso', etiqueta: cred.etiqueta, datos: { key, secret, posiciones } });
    await repo.guardarLink(userId, { ...link, estado: 'ok', ultimoSync: new Date().toISOString() });
    return { ok: true, insertados: r.insertados };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    await repo.guardarLink(userId, { ...link, estado: 'roto' });
    return { ok: false, insertados: 0, error };
  }
}

export async function desconectarBitso(repo: Repo, userId: string) {
  await repo.eliminarCredencial(userId, 'bitso');
  const link = (await repo.links(userId)).find((l) => l.proveedor === 'bitso');
  if (link) await repo.eliminarLink(userId, link.id);
}
