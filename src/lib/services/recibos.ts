// Recibos por correo (Amazon, Mercado Libre, Uber, DiDi, Rappi, Uber Eats): el detalle que el banco no tiene.
// Puros, con tests. Entrada: el correo en texto plano. Salida: qué se compró, cuánto, cuándo y con qué se casa.
// El cuerpo del correo nunca se guarda: solo el resumen que sale de aquí.

import type { Movimiento } from '@/lib/domain/tipos';
import { deISO, diasEntre } from '@/lib/domain/fechas';
import { normalizar } from '@/lib/domain/categorizar';

export type CorreoRecibo = { from: string; subject: string; text: string; fecha: string };

export type Recibo = {
  /** Comercio normalizado: Amazon, Mercado Libre, Uber, DiDi, Rappi, Uber Eats. */
  comercio: string;
  dominio: string;
  /** Total en pesos (dos decimales). */
  total: number;
  /** yyyy-mm-dd del recibo. */
  fecha: string;
  /** Una línea para el historial: "Secadora Remington · 1 de 6 MSI". */
  detalle: string;
  articulos: string[];
  meta: { origen?: string; destino?: string; msi?: number; entrega?: string; pedido?: string; restaurante?: string };
  /** Palabras del descriptor bancario con las que se casa: AMAZON, AMZN, MERCADOPAGO, UBER, DIDI, RAPPI. */
  descriptores: string[];
};

const RE_MONTO = /\$\s?([\d]{1,3}(?:,\d{3})*(?:\.\d{2})?|\d+(?:\.\d{2})?)/;

function limpiar(t: string): string {
  return t.replace(/\r/g, '').replace(/ /g, ' ').replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
}

function monto(re: RegExp, texto: string): number | null {
  const m = re.exec(texto);
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}

function titulo(s: string, max = 48): string {
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

function fechaDe(c: CorreoRecibo): string {
  return c.fecha.slice(0, 10);
}

/** Amazon.com.mx: "Tu pedido de ...", "Pedido recibido", "Enviado: ...". */
function amazon(c: CorreoRecibo, texto: string): Recibo | null {
  if (!/amazon\.com\.mx|amazon\.com|amazon/i.test(c.from) && !/amazon/i.test(c.subject)) return null;
  if (!/pedido|order|enviado|compra/i.test(`${c.subject} ${texto.slice(0, 300)}`)) return null;
  const total = monto(/(?:Total del pedido|Total|Importe total|Order total)[^\d$]{0,20}\$?\s?([\d,]+(?:\.\d{2})?)/i, texto) ?? monto(RE_MONTO, texto);
  if (!total) return null;
  const articulos: string[] = [];
  const m1 = /Tu pedido de\s+"?([^"\n]{3,90}?)"?(?:\s+ha sido|\s+se|\n|$)/i.exec(c.subject + '\n' + texto);
  if (m1) articulos.push(titulo(m1[1]));
  for (const m of texto.matchAll(/^\s*(?:\d+\s*x\s*)?([A-ZÁÉÍÓÚÑ][^\n$]{6,90}?)\s+\$\s?[\d,]+(?:\.\d{2})?\s*$/gm)) {
    const a = titulo(m[1]);
    if (!/total|env[ií]o|subtotal|impuesto|pedido|importe/i.test(a) && !articulos.includes(a)) articulos.push(a);
  }
  const msi = /(\d{1,2})\s*(?:meses sin intereses|MSI|mensualidades)/i.exec(texto);
  const entrega = /(?:Llega|Entrega estimada|Fecha de entrega|Llegará)[:\s]+([^\n]{3,40})/i.exec(texto);
  const pedido = /(?:N[úu]mero de pedido|Pedido|Order)\s*#?:?\s*([\d-]{10,25})/i.exec(texto);
  const partes = [articulos[0] ?? 'Compra en Amazon', articulos.length > 1 ? `+${articulos.length - 1} más` : null, msi ? `1 de ${msi[1]} MSI` : null, entrega ? `llega ${entrega[1].trim().toLowerCase()}` : null].filter(Boolean);
  return { comercio: 'Amazon', dominio: 'amazon.com.mx', total, fecha: fechaDe(c), detalle: partes.join(' · '), articulos, meta: { msi: msi ? Number(msi[1]) : undefined, entrega: entrega?.[1].trim(), pedido: pedido?.[1] }, descriptores: ['AMAZON', 'AMZN'] };
}

/** Mercado Libre: "Compraste ...", "Tu compra de ...". */
function mercadoLibre(c: CorreoRecibo, texto: string): Recibo | null {
  if (!/mercadolibre|mercadopago|mercadolivre/i.test(c.from) && !/mercado libre/i.test(c.subject)) return null;
  if (!/compra|pedido|pagaste|comprast/i.test(`${c.subject} ${texto.slice(0, 300)}`)) return null;
  const total = monto(/(?:Total|Pagaste|Importe)[^\d$]{0,20}\$\s?([\d,]+(?:\.\d{2})?)/i, texto) ?? monto(RE_MONTO, texto);
  if (!total) return null;
  const m = /(?:Compraste|Tu compra de|Pagaste)\s*:?\s*"?([^"\n]{4,90}?)"?(?:\s+por|\s+a\b|\n|$)/i.exec(c.subject + '\n' + texto);
  const articulo = m ? titulo(m[1]) : 'Compra en Mercado Libre';
  const msi = /(\d{1,2})\s*(?:meses sin intereses|MSI|mensualidades)/i.exec(texto);
  const entrega = /(?:Llega|Te llega|Llegará|Entrega)[:\s]+(?:el\s+)?([^\n]{3,40})/i.exec(texto);
  const vendedor = /(?:Vendedor|Tienda oficial)[:\s]+([^\n]{2,40})/i.exec(texto);
  const partes = [articulo, msi ? `1 de ${msi[1]} MSI` : null, entrega ? `llega ${entrega[1].trim().toLowerCase()}` : null].filter(Boolean);
  return { comercio: 'Mercado Libre', dominio: 'mercadolibre.com.mx', total, fecha: fechaDe(c), detalle: partes.join(' · '), articulos: [articulo], meta: { msi: msi ? Number(msi[1]) : undefined, entrega: entrega?.[1].trim(), restaurante: vendedor?.[1].trim() }, descriptores: ['MERCADOLIBRE', 'MERCADO LIBRE', 'MERCADOPAGO', 'MERCADO PAGO', 'MELI'] };
}

/** Uber / DiDi (viajes): origen, destino, duración. */
function viaje(c: CorreoRecibo, texto: string): Recibo | null {
  const esUber = /uber\.com|@uber/i.test(c.from) || /uber/i.test(c.subject);
  const esDidi = /didiglobal|didi/i.test(c.from) || /didi/i.test(c.subject);
  if (!esUber && !esDidi) return null;
  if (/eats|comida|pedido de comida|restaurante/i.test(`${c.subject} ${texto.slice(0, 200)}`)) return null;
  if (!/viaje|trip|recibo|receipt|llegaste|gracias por viajar/i.test(`${c.subject} ${texto.slice(0, 400)}`)) return null;
  const total = monto(/(?:Total|Importe total|Total del viaje)[^\d$]{0,20}\$\s?([\d,]+(?:\.\d{2})?)/i, texto) ?? monto(RE_MONTO, texto);
  if (!total) return null;
  // Dos direcciones con hora: la primera es origen, la segunda destino. También "De X a Y".
  const dirs = [...texto.matchAll(/\b\d{1,2}:\d{2}\s*(?:a\.?\s?m\.?|p\.?\s?m\.?)?\s*\n?\s*([A-ZÁÉÍÓÚÑ0-9][^\n]{6,80})/gi)].map((m) => m[1].trim());
  const deA = /\bDe\s+([^\n]{4,60}?)\s+a\s+([^\n]{4,60})/i.exec(texto);
  const origen = dirs[0] ?? deA?.[1];
  const destino = dirs[1] ?? deA?.[2];
  const dur = /(\d{1,3})\s*min/i.exec(texto);
  const corto = (d?: string) => (d ? titulo(d.split(',')[0], 26) : null);
  const partes = [origen && destino ? `${corto(origen)} → ${corto(destino)}` : 'Viaje', dur ? `${dur[1]} min` : null].filter(Boolean);
  return esUber
    ? { comercio: 'Uber', dominio: 'uber.com', total, fecha: fechaDe(c), detalle: partes.join(' · '), articulos: [], meta: { origen, destino }, descriptores: ['UBER'] }
    : { comercio: 'DiDi', dominio: 'didiglobal.com', total, fecha: fechaDe(c), detalle: partes.join(' · '), articulos: [], meta: { origen, destino }, descriptores: ['DIDI'] };
}

/** Rappi / Uber Eats / DiDi Food: restaurante y artículos. */
function comida(c: CorreoRecibo, texto: string): Recibo | null {
  const esRappi = /rappi/i.test(c.from) || /rappi/i.test(c.subject);
  const esUberEats = (/uber/i.test(c.from) || /uber/i.test(c.subject)) && /eats|pedido|order/i.test(`${c.subject} ${texto.slice(0, 200)}`);
  const esDidiFood = (/didi/i.test(c.from) || /didi/i.test(c.subject)) && /food|pedido|comida/i.test(`${c.subject} ${texto.slice(0, 200)}`);
  if (!esRappi && !esUberEats && !esDidiFood) return null;
  const total = monto(/(?:Total|Total pagado|Importe total|Total del pedido)[^\d$]{0,20}\$\s?([\d,]+(?:\.\d{2})?)/i, texto) ?? monto(RE_MONTO, texto);
  if (!total) return null;
  const rest = /(?:Tu pedido de|Pedido de|Restaurante|Tienda)[:\s]+([^\n]{2,50}?)(?:\s+(?:est[aá]|ya|lleg[oó]|fue)|\n|$)/i.exec(c.subject + '\n' + texto);
  const articulos = [...texto.matchAll(/^\s*(\d+)\s*x\s+([^\n$]{3,60}?)\s*(?:\$[\d,.]+)?\s*$/gm)].map((m) => titulo(`${m[1]} ${m[2]}`, 40)).slice(0, 6);
  const partes = [rest ? titulo(rest[1], 30) : null, articulos.length ? `${articulos.length} ${articulos.length === 1 ? 'artículo' : 'artículos'}` : null].filter(Boolean);
  const base = { total, fecha: fechaDe(c), detalle: partes.join(' · ') || 'Pedido', articulos, meta: { restaurante: rest?.[1].trim() } };
  if (esRappi) return { comercio: 'Rappi', dominio: 'rappi.com.mx', ...base, descriptores: ['RAPPI'] };
  if (esUberEats) return { comercio: 'Uber Eats', dominio: 'ubereats.com', ...base, descriptores: ['UBER EATS', 'UBER'] };
  return { comercio: 'DiDi Food', dominio: 'didiglobal.com', ...base, descriptores: ['DIDI FOOD', 'DIDI'] };
}

/** Parsea un correo de recibo. null si no es de un comercio conocido o no trae total. */
export function parsearRecibo(c: CorreoRecibo): Recibo | null {
  const texto = limpiar(c.text);
  return amazon(c, texto) ?? mercadoLibre(c, texto) ?? comida(c, texto) ?? viaje(c, texto) ?? null;
}

/** Remitentes de recibos (para la consulta de Gmail). */
export const REMITENTES_RECIBOS = ['amazon.com.mx', 'amazon.com', 'mercadolibre.com.mx', 'mercadolibre.com', 'mercadopago.com.mx', 'uber.com', 'didiglobal.com', 'rappi.com', 'rappi.com.mx'];

/**
 * Casa un recibo con un movimiento: descriptor compatible, monto igual (±1 % o ±$1), fecha a ±3 días.
 * Devuelve el mejor candidato y su puntuación (0–1); por debajo de 0.6 no se une.
 */
export function casarRecibo(recibo: Recibo, movimientos: Movimiento[]): { movimiento: Movimiento; puntuacion: number } | null {
  let mejor: { movimiento: Movimiento; puntuacion: number } | null = null;
  const f = deISO(recibo.fecha);
  for (const m of movimientos) {
    if (m.tipo !== 'gasto') continue;
    const desc = normalizar(`${m.descripcionRaw} ${m.comercio}`);
    if (!recibo.descriptores.some((d) => desc.includes(d))) continue;
    const dif = Math.abs(m.monto - recibo.total);
    const montoOk = dif <= Math.max(1, recibo.total * 0.01);
    if (!montoOk) continue;
    const dias = Math.abs(diasEntre(f, deISO(m.fecha)));
    if (dias > 3) continue;
    const puntuacion = Math.round((0.6 + (dif === 0 ? 0.25 : 0.15) + (dias === 0 ? 0.15 : dias === 1 ? 0.1 : 0.05)) * 100) / 100;
    if (!mejor || puntuacion > mejor.puntuacion) mejor = { movimiento: m, puntuacion };
  }
  return mejor && mejor.puntuacion >= 0.6 ? mejor : null;
}

/** Convierte la lectura del modelo (correo sin parser) al mismo formato que los parsers. */
export function reciboDesdeLLM(r: { comercio: string | null; dominio: string | null; total: number | null; fecha: string | null; detalle: string; articulos: string[]; origen: string | null; destino: string | null; msi: number | null; descriptores: string[] }, fechaCorreo: string): Recibo | null {
  if (!r.comercio || !r.total) return null;
  const descriptores = r.descriptores.map((d) => d.toUpperCase().trim()).filter((d) => d.length >= 3);
  if (!descriptores.length) descriptores.push(r.comercio.toUpperCase());
  return {
    comercio: r.comercio,
    dominio: r.dominio ?? '',
    total: Math.round(r.total * 100) / 100,
    fecha: r.fecha && /^\d{4}-\d{2}-\d{2}$/.test(r.fecha) ? r.fecha : fechaCorreo.slice(0, 10),
    detalle: r.detalle.slice(0, 80) || r.comercio,
    articulos: r.articulos.slice(0, 10),
    meta: { origen: r.origen ?? undefined, destino: r.destino ?? undefined, msi: r.msi ?? undefined },
    descriptores,
  };
}

/** Remitentes que nunca son recibos (bancos): no vale la pena mandarlos al modelo. */
export function pareceComercio(from: string): boolean {
  return !/bbva|americanexpress|banorte|santander|hsbc|banamex|scotiabank|nu\.com|klar|storicard|heybanco|mercadopago\.com\.mx.*alerta/i.test(from);
}
