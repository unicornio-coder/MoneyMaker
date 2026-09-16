// Formato monetario y de fechas del producto: es-MX, MXN, sin decimales.

const mxn = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

/** `$12,450`. Negativos: `-$1,200`. */
export function money(value: number): string {
  const abs = mxn.format(Math.abs(Math.round(value)));
  return value < 0 ? `-${abs}` : abs;
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

/** `9 sep` */
export function fechaCorta(d: Date | string): string {
  const x = typeof d === 'string' ? new Date(d) : d;
  return `${x.getDate()} ${MESES_CORTOS[x.getMonth()]}`;
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
  const x = typeof d === 'string' ? new Date(d) : d;
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
