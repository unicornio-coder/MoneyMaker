// Motor de quincena: el ciclo real del dinero en México.
// Un periodo de quincena va de un día de pago (inclusive) al día anterior al siguiente día de pago.
// Con días de pago [5, 20]: Q1 sep = 5–19 sep, Q2 sep = 20 sep – 4 oct. La etiqueta usa el mes del día de pago.

import { aISO, deISO, diasEntre, sumarDias, sumarMeses, ultimoDiaDelMes } from './fechas';
import type { Periodo } from './tipos';

export type Rango = {
  /** ISO inclusive */
  inicio: string;
  /** ISO inclusive */
  fin: string;
  etiqueta: string;
  /** Etiqueta corta para gráficas: 'Q1 sep', 'sep', '2026' */
  corta: string;
  periodo: Periodo;
};

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESES_LARGOS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function normalizarDias(dias: number[]): number[] {
  const limpios = Array.from(new Set(dias.map((d) => Math.min(31, Math.max(1, Math.round(d)))))).sort((a, b) => a - b);
  return limpios.length ? limpios : [5, 20];
}

/** Días de pago de un mes concreto, ajustados al último día si el mes es más corto (p. ej. 31 → 30). */
function diasDePagoEnMes(anio: number, mes: number, dias: number[]): Date[] {
  const ultimo = ultimoDiaDelMes(new Date(anio, mes, 1));
  return dias.map((d) => new Date(anio, mes, Math.min(d, ultimo)));
}

/** Todos los días de pago desde un mes antes hasta un mes después de la fecha (ordenados). */
function diasDePagoAlrededor(fecha: Date, dias: number[]): Date[] {
  const out: Date[] = [];
  for (let k = -1; k <= 1; k++) {
    const m = sumarMeses(new Date(fecha.getFullYear(), fecha.getMonth(), 1), k);
    out.push(...diasDePagoEnMes(m.getFullYear(), m.getMonth(), dias));
  }
  return out.sort((a, b) => a.getTime() - b.getTime());
}

/** Quincena que contiene la fecha. */
export function quincenaDe(fecha: Date, diasPago: number[] = [5, 20]): Rango {
  const dias = normalizarDias(diasPago);
  const pagos = diasDePagoAlrededor(fecha, dias);
  let inicio = pagos[0];
  let fin = pagos[1];
  for (let i = 0; i < pagos.length - 1; i++) {
    if (pagos[i].getTime() <= fecha.getTime() && fecha.getTime() < pagos[i + 1].getTime()) {
      inicio = pagos[i];
      fin = pagos[i + 1];
      break;
    }
  }
  const indice = dias.findIndex((d) => Math.min(d, ultimoDiaDelMes(inicio)) === inicio.getDate());
  const numero = dias.length === 1 ? '' : `Q${indice + 1} `;
  const corta = `${numero}${MESES[inicio.getMonth()]}`;
  return {
    inicio: aISO(inicio),
    fin: aISO(sumarDias(fin, -1)),
    etiqueta: `${numero.trim() ? `Quincena ${indice + 1} de ` : ''}${MESES_LARGOS[inicio.getMonth()].toLowerCase()} ${inicio.getFullYear()}`,
    corta,
    periodo: 'q',
  };
}

export function mesDe(fecha: Date): Rango {
  const inicio = new Date(fecha.getFullYear(), fecha.getMonth(), 1);
  const fin = new Date(fecha.getFullYear(), fecha.getMonth(), ultimoDiaDelMes(inicio));
  return { inicio: aISO(inicio), fin: aISO(fin), etiqueta: `${MESES_LARGOS[inicio.getMonth()]} ${inicio.getFullYear()}`, corta: MESES[inicio.getMonth()], periodo: 'mes' };
}

export function anioDe(fecha: Date): Rango {
  const y = fecha.getFullYear();
  return { inicio: `${y}-01-01`, fin: `${y}-12-31`, etiqueta: String(y), corta: String(y), periodo: 'anio' };
}

/** Rango del periodo elegido que contiene la fecha. */
export function rangoDe(periodo: Periodo, fecha: Date, diasPago: number[] = [5, 20]): Rango {
  if (periodo === 'q') return quincenaDe(fecha, diasPago);
  if (periodo === 'mes') return mesDe(fecha);
  return anioDe(fecha);
}

/** Periodo anterior/siguiente al rango dado (`n` puede ser negativo). */
export function desplazar(rango: Rango, n: number, diasPago: number[] = [5, 20]): Rango {
  if (n === 0) return rango;
  const paso = n > 0 ? 1 : -1;
  let actual = rango;
  for (let i = 0; i < Math.abs(n); i++) {
    const inicio = deISO(actual.inicio);
    if (actual.periodo === 'q') {
      const punto = paso > 0 ? sumarDias(deISO(actual.fin), 1) : sumarDias(inicio, -1);
      actual = quincenaDe(punto, diasPago);
    } else if (actual.periodo === 'mes') {
      actual = mesDe(sumarMeses(inicio, paso));
    } else {
      actual = anioDe(new Date(inicio.getFullYear() + paso, 0, 1));
    }
  }
  return actual;
}

/** Los últimos `n` periodos terminando en el actual (orden cronológico). */
export function ultimosPeriodos(periodo: Periodo, n: number, hoy = new Date(), diasPago: number[] = [5, 20]): Rango[] {
  const actual = rangoDe(periodo, hoy, diasPago);
  const out: Rango[] = [actual];
  for (let i = 1; i < n; i++) out.unshift(desplazar(out[0], -1, diasPago));
  return out;
}

export function enRango(fechaISO: string, rango: Rango): boolean {
  const f = fechaISO.slice(0, 10);
  return f >= rango.inicio && f <= rango.fin;
}

export function diasDelRango(rango: Rango): number {
  return diasEntre(deISO(rango.inicio), deISO(rango.fin)) + 1;
}

/** Días que faltan para que termine el rango, contando hoy. 0 si ya terminó. */
export function diasRestantes(rango: Rango, hoy = new Date()): number {
  const fin = deISO(rango.fin);
  const d = diasEntre(hoy, fin) + 1;
  return Math.max(0, Math.min(d, diasDelRango(rango)));
}

/** Próximo día de pago a partir de hoy (inclusive). */
export function proximoDiaDePago(hoy = new Date(), diasPago: number[] = [5, 20]): Date {
  const dias = normalizarDias(diasPago);
  const pagos = diasDePagoAlrededor(hoy, dias);
  return pagos.find((p) => p.getTime() >= new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime()) ?? pagos[pagos.length - 1];
}

/** Cuántas veces cae un cobro con esta frecuencia dentro de un periodo (para prorratear fijos). */
export function vecesPorPeriodo(frecuencia: 'semanal' | 'quincenal' | 'mensual' | 'anual', periodo: Periodo): number {
  const porMes = { semanal: 52 / 12, quincenal: 2, mensual: 1, anual: 1 / 12 }[frecuencia];
  if (periodo === 'mes') return porMes;
  if (periodo === 'q') return porMes / 2;
  return porMes * 12;
}
