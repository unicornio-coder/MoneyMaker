// Cliente Belvo (REST, auth básica con secretId:secretPassword). Sandbox o producción según BELVO_ENV.
// Docs: developers.belvo.com. Endpoints usados: /api/token/ (widget), /api/institutions/, /api/accounts/, /api/transactions/, /api/links/.

import type { MovimientoCrudo, TipoCuenta } from '@/lib/domain/tipos';
import { infoBanco } from '@/lib/domain/comercios';
import type { Aggregator, CuentaExterna, Institucion, ResultadoSync } from './aggregator';
import { INSTITUCIONES_MX } from './aggregator.mock';

const BASE = { sandbox: 'https://sandbox.belvo.com', development: 'https://development.belvo.com', production: 'https://api.belvo.com' } as const;

function base() {
  const env = (process.env.BELVO_ENV ?? 'sandbox') as keyof typeof BASE;
  return BASE[env] ?? BASE.sandbox;
}

function auth() {
  return 'Basic ' + Buffer.from(`${process.env.BELVO_SECRET_ID}:${process.env.BELVO_SECRET_PASSWORD}`).toString('base64');
}

async function belvoFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${base()}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: auth(), ...(init.headers ?? {}) },
    cache: 'no-store',
  });
  if (!res.ok) {
    const cuerpo = await res.text().catch(() => '');
    throw new Error(`Belvo ${init.method ?? 'GET'} ${path} → ${res.status}: ${cuerpo.slice(0, 300)}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Recorre todas las páginas de un listado de Belvo. */
async function todas<T>(path: string): Promise<T[]> {
  const out: T[] = [];
  let next: string | null = `${base()}${path}`;
  while (next) {
    const res: Response = await fetch(next, { headers: { Authorization: auth() }, cache: 'no-store' });
    if (!res.ok) throw new Error(`Belvo GET ${path} → ${res.status}`);
    const json = (await res.json()) as { results: T[]; next: string | null };
    out.push(...json.results);
    next = json.next;
  }
  return out;
}

type BelvoInstitution = { name: string; display_name: string; type: string; website: string | null; country_codes: string[]; status: string; resources: string[] };
type BelvoAccount = {
  id: string;
  institution: { name: string; type: string };
  name: string;
  number: string | null;
  category: string;
  type: string | null;
  balance: { current: number | null; available: number | null };
  credit_data: { credit_limit: number | null; minimum_payment: number | null; cutting_date: string | null; next_payment_date: string | null } | null;
};
type BelvoTransaction = {
  id: string;
  account: { id: string };
  value_date: string;
  accounting_date: string | null;
  description: string;
  amount: number;
  type: 'INFLOW' | 'OUTFLOW';
  category: string | null;
  status: string;
};

function tipoCuenta(a: BelvoAccount): TipoCuenta {
  const c = a.category.toUpperCase();
  if (c.includes('CREDIT')) return 'credito';
  if (c.includes('INVESTMENT') || c.includes('PENSION') || c.includes('FUND')) return 'inversion';
  return 'debito';
}

function nombreVisible(nombreInstitucion: string) {
  // Belvo usa ids tipo 'bbva_mx_retail', 'banorte_mx_retail', 'nu_mx_retail'.
  const raw = nombreInstitucion.replace(/_mx.*$/i, '').replace(/_/g, ' ');
  return infoBanco(raw);
}

export const belvo: Aggregator = {
  nombre: 'belvo',

  async listarInstituciones(): Promise<Institucion[]> {
    // Lista de Belvo + catálogo fijo de respaldo: si Belvo falla o trae pocas (sandbox), el usuario siempre ve bancos.
    let deBelvo: Institucion[] = [];
    try {
      const lista = await todas<BelvoInstitution>('/api/institutions/?country_code=MX&page_size=100');
      deBelvo = lista
        .filter((i) => i.type === 'bank' || i.type === 'fintech')
        .map((i) => {
          const info = nombreVisible(i.name);
          const dominio = info.dominio || (i.website ? i.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/.*$/, '') : '');
          return { id: i.name, nombre: i.display_name || info.nombre, dominio, tipo: i.type === 'bank' ? 'banco' : 'fintech', automatica: true } as Institucion;
        });
    } catch (e) {
      console.error('[belvo] no se pudo listar instituciones:', e instanceof Error ? e.message : e);
    }
    const vistos = new Set(deBelvo.map((i) => i.nombre.toLowerCase()));
    const respaldo = INSTITUCIONES_MX.filter((i) => !vistos.has(i.nombre.toLowerCase()));
    return [...deBelvo, ...respaldo];
  },

  async tokenWidget(userId, opciones) {
    const body: Record<string, unknown> = {
      id: process.env.BELVO_SECRET_ID,
      password: process.env.BELVO_SECRET_PASSWORD,
      scopes: 'read_institutions,write_links,read_links',
      widget: {
        branding: { company_name: 'MoneyMaker', company_icon: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/icon.svg` },
        callback_urls: { success: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/app?link=ok`, exit: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/app` },
      },
      external_id: userId,
      fetch_resources: ['ACCOUNTS', 'TRANSACTIONS', 'OWNERS'],
      stale_in: '365d',
    };
    if (opciones?.linkId) body.link_id = opciones.linkId;
    const r = await belvoFetch<{ access: string; refresh: string }>('/api/token/', { method: 'POST', body: JSON.stringify(body) });
    return { access: r.access, refresh: r.refresh };
  },

  async sincronizar(linkExternalId, desde): Promise<ResultadoSync> {
    const cuentasB = await todas<BelvoAccount>(`/api/accounts/?link=${linkExternalId}&page_size=100`);
    const hoy = new Date().toISOString().slice(0, 10);
    const movsB = await todas<BelvoTransaction>(`/api/transactions/?link=${linkExternalId}&value_date__gte=${desde}&value_date__lte=${hoy}&page_size=1000`);

    const cuentas: CuentaExterna[] = cuentasB.map((a) => {
      const info = nombreVisible(a.institution.name);
      return {
        externalId: a.id,
        nombre: `${info.nombre} ${tipoCuenta(a) === 'credito' ? 'Crédito' : tipoCuenta(a) === 'inversion' ? 'Inversión' : 'Débito'}`,
        banco: info.nombre,
        bancoDominio: info.dominio,
        tipo: tipoCuenta(a),
        ultimos4: a.number ? a.number.replace(/\D/g, '').slice(-4) : null,
        saldo: tipoCuenta(a) === 'credito' ? Math.abs(a.balance.current ?? 0) : (a.balance.available ?? a.balance.current ?? 0),
        limite: a.credit_data?.credit_limit ?? null,
        pagoMinimo: a.credit_data?.minimum_payment ?? null,
        fechaCorte: a.credit_data?.cutting_date ?? null,
        fechaLimite: a.credit_data?.next_payment_date ?? null,
      };
    });

    const movimientos: Record<string, MovimientoCrudo[]> = {};
    for (const t of movsB) {
      if (t.status && t.status.toUpperCase() === 'PENDING') continue;
      const lista = (movimientos[t.account.id] ??= []);
      lista.push({
        externalId: t.id,
        fecha: (t.value_date ?? t.accounting_date ?? hoy).slice(0, 10),
        descripcion: t.description,
        monto: Math.abs(t.amount),
        esAbono: t.type === 'INFLOW',
        categoriaProveedor: t.category,
      });
    }
    return { cuentas, movimientos };
  },

  async eliminarLink(linkExternalId) {
    await belvoFetch<void>(`/api/links/${linkExternalId}/`, { method: 'DELETE' });
  },
};

/** Verifica la firma de un webhook de Belvo (cabecera `Authorization: Bearer <secret>` configurado en el dashboard). */
export function webhookAutorizado(req: Request): boolean {
  const secreto = process.env.BELVO_WEBHOOK_SECRET;
  if (!secreto) return false;
  const h = req.headers.get('authorization') ?? '';
  return h === `Bearer ${secreto}` || h === secreto;
}
