// Formato monetario y de fechas del producto: es-MX, MXN, sin decimales.
// Las fechas del dominio son civiles ('yyyy-mm-dd', zona America/Mexico_City): nunca se parsean con `new Date(string)`,
// porque JavaScript las interpreta en UTC y en México aparecen un día antes.

import { deISO } from '@/lib/domain/fechas';

const mxn = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

/** `$12,450`. Negativos: `-$1,200`. */
export function formatMXN(value: number): string {
  const abs = mxn.format(Math.abs(Math.round(value)));
  return value < 0 ? `-${abs}` : abs;
}

/** Alias histórico de `formatMXN`. */
export const money = formatMXN;

/** Fecha civil a Date local a medianoche. Acepta 'yyyy-mm-dd', ISO con hora (se toma el día civil) o Date. */
export function aFecha(d: Date | string): Date {
  if (d instanceof Date) return d;
  if (/^\d{4}-\d{2}-\d{2}/.test(d)) return deISO(d);
  const x = new Date(d);
  return Number.isNaN(x.getTime()) ? new Date(NaN) : x;
}

type EstiloFecha = 'corta' | 'media' | 'larga' | 'mes';

/**
 * `9 sep` (corta), `9 sep 2026` (media), `9 de septiembre de 2026` (larga), `Septiembre 2026` (mes).
 * Siempre a partir de la fecha civil: '2026-09-09' se muestra como 9 sep en cualquier zona horaria.
 */
export function formatFecha(d: Date | string, estilo: EstiloFecha = 'corta'): string {
  const x = aFecha(d);
  if (Number.isNaN(x.getTime())) return '';
  switch (estilo) {
    case 'media':
      return `${x.getDate()} ${MESES_CORTOS[x.getMonth()]} ${x.getFullYear()}`;
    case 'larga':
      return `${x.getDate()} de ${MESES[x.getMonth()]} de ${x.getFullYear()}`;
    case 'mes':
      return mesLargo(x);
    default:
      return `${x.getDate()} ${MESES_CORTOS[x.getMonth()]}`;
  }
}

/** `pluralize(1, 'cuenta')` → `1 cuenta`; `pluralize(3, 'movimiento')` → `3 movimientos`; plural explícito para irregulares. */
export function pluralize(n: number, singular: string, plural?: string): string {
  const p = plural ?? (/[aeiou]$/i.test(singular) ? `${singular}s` : /z$/i.test(singular) ? `${singular.slice(0, -1)}ces` : `${singular}es`);
  return `${new Intl.NumberFormat('es-MX').format(n)} ${n === 1 ? singular : p}`;
}

/** `Buenos días, JC` según la hora local del cliente (0–23). Sin nombre: `Buenos días`. */
export function saludo(nombre?: string | null, hora = new Date().getHours()): string {
  const s = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches';
  const n = nombre?.trim();
  return n ? `${s}, ${n}` : s;
}

/** `$8k` para etiquetas de rejilla. */
export function moneyShort(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${(abs / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (abs >= 1000) return `$${Math.round(abs / 1000)}k`;
  return `$${Math.round(abs)}`;
}

/** `+12.3 %` / `-2.4 %` */
export function pct(value: number, digits = 1): string {
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  return `${sign}${Math.abs(value).toFixed(digits)} %`;
}

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

/** `9 sep` (fecha civil). */
export function fechaCorta(d: Date | string): string {
  return formatFecha(d, 'corta');
}

/** `Septiembre 2026` */
export function mesLargo(d: Date): string {
  const m = MESES[d.getMonth()];
  return `${m[0].toUpperCase()}${m.slice(1)} ${d.getFullYear()}`;
}

export function mesCorto(d: Date): string {
  return MESES_CORTOS[d.getMonth()];
}

export function diaCorto(d: Date): string {
  return DIAS_CORTOS[d.getDay()];
}

/** Hoy / Ayer / `9 sep` */
export function fechaRelativa(d: Date | string, hoy = new Date()): string {
  const x = aFecha(d);
  const a = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const b = new Date(x.getFullYear(), x.getMonth(), x.getDate());
  const diff = Math.round((a.getTime() - b.getTime()) / 86_400_000);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Ayer';
  return fechaCorta(x);
}

/** Favicon público (solo prototipo). En producción se sustituye por /public/logos. */
export function favicon(domain: string, size = 128): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
}

export function iniciales(nombre: string): string {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}
