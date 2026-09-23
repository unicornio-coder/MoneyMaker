// Series por periodo para las gráficas (Inicio: pastillas; Gastos: barras).

import { enRango, rangoDe, ultimosPeriodos, type Rango } from './quincena';
import type { Movimiento, Periodo } from './tipos';

export type PuntoSerie = { rango: Rango; ingreso: number; gasto: number };

export function esIngreso(m: Movimiento): boolean {
  return m.tipo === 'ingreso';
}

export function esGasto(m: Movimiento): boolean {
  return m.tipo === 'gasto';
}

/** Últimos `n` periodos con ingreso y gasto. */
export function seriePeriodos(movs: Movimiento[], periodo: Periodo, n: number, hoy = new Date(), diasPago: number[] = [5, 20]): PuntoSerie[] {
  return ultimosPeriodos(periodo, n, hoy, diasPago).map((rango) => {
    let ingreso = 0;
    let gasto = 0;
    for (const m of movs) {
      if (!enRango(m.fecha, rango)) continue;
      if (esIngreso(m)) ingreso += m.monto;
      else if (esGasto(m)) gasto += m.monto;
    }
    return { rango, ingreso, gasto };
  });
}

/** Variación % del último punto contra el anterior (null si no hay base). */
export function variacion(actual: number, anterior: number): number | null {
  if (!anterior) return null;
  return ((actual - anterior) / anterior) * 100;
}

/** Gasto por categoría en un rango, ordenado desc. */
export function gastoPorCategoria(movs: Movimiento[], rango: Rango, cuentaId?: string | null): { categoriaId: string; monto: number; movimientos: number }[] {
  const acc = new Map<string, { monto: number; movimientos: number }>();
  for (const m of movs) {
    if (!esGasto(m) || !enRango(m.fecha, rango) || (cuentaId && m.cuentaId !== cuentaId)) continue;
    const a = acc.get(m.categoriaId) ?? { monto: 0, movimientos: 0 };
    a.monto += m.monto;
    a.movimientos += 1;
    acc.set(m.categoriaId, a);
  }
  return [...acc.entries()].map(([categoriaId, v]) => ({ categoriaId, ...v })).sort((a, b) => b.monto - a.monto);
}

export type RangoConDatos = { rango: Rango; actual: boolean };

/**
 * El periodo que se muestra por defecto: el actual si tiene movimientos; si no (los estados de cuenta terminan
 * antes de hoy), el último de los `n` anteriores que sí los tenga. `actual: false` → la UI dice "Basado en <periodo>".
 */
export function ultimoRangoConDatos(movs: Movimiento[], periodo: Periodo, hoy = new Date(), diasPago: number[] = [5, 20], n = 13): RangoConDatos {
  const actual = rangoDe(periodo, hoy, diasPago);
  const hayDatos = (r: Rango) => movs.some((m) => enRango(m.fecha, r) && (esGasto(m) || esIngreso(m)));
  if (hayDatos(actual) || !movs.length) return { rango: actual, actual: true };
  const previos = ultimosPeriodos(periodo, n, hoy, diasPago).reverse();
  const ultimo = previos.find(hayDatos);
  return ultimo ? { rango: ultimo, actual: false } : { rango: actual, actual: true };
}
