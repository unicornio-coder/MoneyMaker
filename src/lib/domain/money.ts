// Dinero en centavos enteros. Las tablas y pantallas viejas usan pesos con dos decimales; la conversión vive aquí.

const mxn = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0, minimumFractionDigits: 0 });

export function aCentavos(pesos: number): number {
  return Math.round(pesos * 100);
}

export function aPesos(centavos: number): number {
  return Math.round(centavos) / 100;
}

/** `$12,450` a partir de centavos. Negativos: `-$1,200`. */
export function formatearCentavos(centavos: number): string {
  const abs = mxn.format(Math.abs(Math.round(centavos / 100)));
  return centavos < 0 ? `-${abs}` : abs;
}

/** '$1,238.00' → 123800 · '(450.00)' → -45000 · '-1,200' → -120000 · '1.234,56' → 123456 */
export function parsearMontoCentavos(v: unknown): number | null {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? aCentavos(v) : null;
  let s = String(v).replace(/[^\d.,()\-+]/g, '');
  if (!s) return null;
  const negativo = /^\(.*\)$/.test(s) || s.startsWith('-');
  s = s.replace(/[()\-+]/g, '');
  if (/,\d{2}$/.test(s) && !/\.\d{2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
  else s = s.replace(/,/g, '');
  const n = Number(s);
  if (Number.isNaN(n)) return null;
  const c = aCentavos(n);
  return negativo ? -c : c;
}

export function sumarCentavos(lista: number[]): number {
  return lista.reduce((s, x) => s + Math.round(x), 0);
}
