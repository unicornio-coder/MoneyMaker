// Parsers de correos de alerta bancaria (BBVA, Amex, Nu, Banorte, Santander, HSBC). Puros, con tests.
// Entrada: remitente, asunto, cuerpo en texto plano y fecha. Salida: movimiento crudo + banco + últimos 4.

import type { MovimientoCrudo } from '@/lib/domain/tipos';

export type CorreoAlerta = { from: string; subject: string; text: string; fecha: string };
export type AlertaParseada = { banco: string; tipoCuenta: 'credito' | 'debito'; ultimos4: string | null; movimiento: MovimientoCrudo };

const BANCOS: { patron: RegExp; banco: string }[] = [
  { patron: /bbva/i, banco: 'BBVA' },
  { patron: /americanexpress|amex/i, banco: 'Amex' },
  { patron: /nu\.com|nubank|@nu\./i, banco: 'Nu' },
  { patron: /banorte/i, banco: 'Banorte' },
  { patron: /santander/i, banco: 'Santander' },
  { patron: /hsbc/i, banco: 'HSBC' },
  { patron: /banamex|citibanamex/i, banco: 'Banamex' },
  { patron: /scotiabank/i, banco: 'Scotiabank' },
];

const RE_MONTO = /\$\s?([\d]{1,3}(?:,\d{3})*(?:\.\d{2})?|\d+(?:\.\d{2})?)\s*(?:MXN|M\.?N\.?|pesos)?/i;
const RE_ULTIMOS4 = /(?:terminaci[oó]n|termina en|tarjeta\s*(?:\*+|x+|•+)?|\*{2,}|x{2,}|•{2,})\s*:?\s*(\d{4})\b/i;
const RE_COMERCIO = /\b(?:en|at|con el comercio|comercio:?)\s+([A-Z0-9ÁÉÍÓÚÑ][A-Za-z0-9ÁÉÍÓÚÑáéíóúñ .*&'\-/]{2,60}?)(?=\s+(?:con|el|por|desde|a las|,|\.|$)|\n|$)/m;
const RE_ABONO = /\b(abono|dep[oó]sito|te depositaron|pago recibido|recibiste|transferencia recibida|n[oó]mina)\b/i;
const RE_RECHAZO = /\b(rechazad|declinad|no fue posible|fallid|intento de)/i;
const RE_CREDITO = /tarjeta de cr[eé]dito|TDC|cr[eé]dito/i;
const RE_DEBITO = /tarjeta de d[eé]bito|TDD|d[eé]bito|cuenta/i;

function limpiarTexto(t: string): string {
  return t.replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n{2,}/g, '\n').trim();
}

/** Detecta el banco por remitente o contenido. */
export function bancoDe(c: CorreoAlerta): string | null {
  const fuente = `${c.from} ${c.subject}`;
  for (const b of BANCOS) if (b.patron.test(fuente)) return b.banco;
  for (const b of BANCOS) if (b.patron.test(c.text.slice(0, 400))) return b.banco;
  return null;
}

/** Parsea una alerta de compra/cargo/abono. Devuelve null si no es un movimiento (promos, estados de cuenta, rechazos). */
export function parsearAlerta(c: CorreoAlerta): AlertaParseada | null {
  const banco = bancoDe(c);
  if (!banco) return null;
  const texto = limpiarTexto(`${c.subject}\n${c.text}`);
  if (RE_RECHAZO.test(texto.slice(0, 300))) return null;
  if (/estado de cuenta|tu estado de cuenta|resumen mensual|promoci[oó]n|meses sin intereses en|oferta/i.test(c.subject) && !/compra|cargo|abono|dep[oó]sito/i.test(c.subject)) return null;

  const m = RE_MONTO.exec(texto);
  if (!m) return null;
  const monto = Number(m[1].replace(/,/g, ''));
  if (!(monto > 0)) return null;

  const cm = RE_COMERCIO.exec(texto.replace(/\$\s?[\d,.]+\s*(MXN|M\.?N\.?|pesos)?/gi, ' '));
  let comercio = cm?.[1]?.trim() ?? '';
  comercio = comercio.replace(/\s+(con|el|por|desde)$/i, '').trim();
  if (!comercio) comercio = /transferencia/i.test(texto) ? 'Transferencia' : /retiro|cajero/i.test(texto) ? 'Retiro de efectivo' : `Cargo ${banco}`;

  const u4 = RE_ULTIMOS4.exec(texto);
  const esAbono = RE_ABONO.test(c.subject) || (RE_ABONO.test(texto.slice(0, 200)) && !/compra|cargo/i.test(c.subject));
  const tipoCuenta: 'credito' | 'debito' = banco === 'Amex' || banco === 'Nu' ? 'credito' : RE_CREDITO.test(texto) && !RE_DEBITO.test(c.subject) ? 'credito' : 'debito';

  const fechaTexto = /(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/.exec(texto);
  const fecha = fechaTexto ? `${fechaTexto[3]}-${fechaTexto[2].padStart(2, '0')}-${fechaTexto[1].padStart(2, '0')}` : c.fecha.slice(0, 10);

  return {
    banco,
    tipoCuenta,
    ultimos4: u4?.[1] ?? null,
    movimiento: { fecha, descripcion: comercio, monto, esAbono, externalId: null },
  };
}
