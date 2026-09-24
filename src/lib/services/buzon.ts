// Lo común de los buzones (Gmail, Outlook): qué remitentes importan, cómo limpiar HTML y cómo ingerir
// una tanda de correos ya descargados (alertas agrupadas por cuenta + recibos casados con los cargos).

import type { Repo, Link } from '@/lib/data/repo';
import { infoBanco } from '@/lib/domain/comercios';
import { ingerirMovimientos } from './ingest';
import { parsearAlerta, type AlertaParseada, type CorreoAlerta } from './gmail.parsers';
import { parsearRecibo, pareceComercio, reciboDesdeLLM, REMITENTES_RECIBOS, type Recibo } from './recibos';
import { extraerReciboConLLM } from './llm';
import { aplicarRecibos } from './enriquecer';

/** Dominios de bancos cuyas alertas leemos. */
export const REMITENTES_BANCOS = ['bbva.mx', 'bbva.com', 'americanexpress.com', 'nu.com.mx', 'banorte.com', 'santander.com.mx', 'hsbc.com.mx', 'banamex.com', 'scotiabank.com.mx'];

/** Todos los remitentes que vale la pena descargar (bancos + comercios con recibo). */
export const REMITENTES = [...REMITENTES_BANCOS, ...REMITENTES_RECIBOS];

/** ¿El remitente (cabecera From) es de un banco o comercio que leemos? */
export function remitenteRelevante(from: string): boolean {
  const dominio = (from.match(/@([\w.-]+)/)?.[1] ?? '').toLowerCase();
  return !!dominio && REMITENTES.some((d) => dominio === d || dominio.endsWith(`.${d}`));
}

export function limpiarHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

export type ResultadoBuzon = { insertados: number; recibos: number; ignorados: number };

/** Ingiere correos ya descargados: alertas → movimientos por cuenta (se crea si falta); recibos → detalle del cargo. */
export async function ingerirCorreos(repo: Repo, userId: string, link: Link, correos: CorreoAlerta[], fuente: 'gmail' | 'outlook'): Promise<ResultadoBuzon> {
  const recibos: Recibo[] = [];
  const porCuenta = new Map<string, { banco: string; tipoCuenta: 'credito' | 'debito'; ultimos4: string | null; parseados: AlertaParseada[] }>();
  let ignorados = 0;
  for (const correo of correos) {
    const recibo = parsearRecibo(correo);
    if (recibo) {
      recibos.push(recibo);
      continue;
    }
    const p = parsearAlerta(correo);
    if (!p) {
      if (pareceComercio(correo.from)) {
        const leido = await extraerReciboConLLM(correo);
        const r2 = leido ? reciboDesdeLLM(leido, correo.fecha) : null;
        if (r2) {
          recibos.push(r2);
          continue;
        }
      }
      ignorados++;
      continue;
    }
    const k = `${p.banco}|${p.tipoCuenta}|${p.ultimos4 ?? ''}`;
    const g = porCuenta.get(k) ?? { banco: p.banco, tipoCuenta: p.tipoCuenta, ultimos4: p.ultimos4, parseados: [] };
    g.parseados.push(p);
    porCuenta.set(k, g);
  }

  let insertados = 0;
  const cuentas = await repo.cuentas(userId);
  for (const g of porCuenta.values()) {
    const info = infoBanco(g.banco);
    let cuenta = cuentas.find((c) => c.banco === info.nombre && (!g.ultimos4 || c.ultimos4 === g.ultimos4)) ?? cuentas.find((c) => c.banco === info.nombre && c.tipo === g.tipoCuenta);
    if (!cuenta) {
      cuenta = await repo.guardarCuenta(userId, { linkId: link.id, externalId: `${fuente}:${info.nombre}:${g.ultimos4 ?? g.tipoCuenta}`, nombre: `${info.nombre} ${g.tipoCuenta === 'credito' ? 'Crédito' : 'Débito'}`, banco: info.nombre, bancoDominio: info.dominio || null, tipo: g.tipoCuenta, ultimos4: g.ultimos4, saldo: 0, color: info.color, activo: true });
      cuentas.push(cuenta);
    }
    const r = await ingerirMovimientos(repo, userId, cuenta, g.parseados.map((p) => p.movimiento), fuente);
    insertados += r.insertados;
  }
  const enriquecidos = await aplicarRecibos(repo, userId, recibos);
  return { insertados, recibos: enriquecidos.casados, ignorados };
}
