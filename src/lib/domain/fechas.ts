// Utilidades de fecha sin zona horaria: trabajamos con 'yyyy-mm-dd' y Date locales a medianoche.

export function aISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function deISO(s: string): Date {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function sumarDias(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function sumarMeses(d: Date, n: number): Date {
  const x = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const ultimo = new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate();
  x.setDate(Math.min(d.getDate(), ultimo));
  return x;
}

export function diasEntre(a: Date, b: Date): number {
  const ma = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const mb = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((mb - ma) / 86_400_000);
}

export function ultimoDiaDelMes(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

export function mismoDia(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
