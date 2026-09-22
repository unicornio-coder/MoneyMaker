// Deduplicación y cuadre de un estado de cuenta. Sin I/O.

import type { Cuadre, MovimientoNormalizado, ResumenEstado } from './tipos';
import { normalizar } from './categorizar';

type Base = { fecha: string; descripcion: string; esAbono: boolean };

/**
 * Numera los repetidos exactos (misma fecha, descripción y monto) dentro de un mismo lote:
 * dos cargos idénticos en un estado de cuenta son reales y se conservan; el mismo cargo en dos
 * periodos traslapados recibe el mismo índice y se deduplica por hash.
 */
export function indexarRepetidos<T extends Base & ({ monto: number } | { montoCentavos: number })>(lista: T[]): (T & { repeticion: number })[] {
  const vistos = new Map<string, number>();
  return lista.map((m) => {
    const monto = 'montoCentavos' in m ? m.montoCentavos : Math.round(m.monto * 100);
    const clave = `${m.fecha.slice(0, 10)}|${normalizar(m.descripcion).replace(/\s/g, '')}|${monto}|${m.esAbono ? 'A' : 'C'}`;
    const n = vistos.get(clave) ?? 0;
    vistos.set(clave, n + 1);
    return { ...m, repeticion: n };
  });
}

export type ResultadoCuadre = { cuadre: Cuadre; cargosCentavos: number; abonosCentavos: number; diferenciaCargosCentavos: number | null; diferenciaAbonosCentavos: number | null };

const TOLERANCIA_PCT = 0.01;
const TOLERANCIA_CENTAVOS = 50_00;

function cuadra(suma: number, total: number | null): boolean | null {
  if (total == null) return null;
  const dif = Math.abs(suma - total);
  return dif <= TOLERANCIA_CENTAVOS || dif <= Math.abs(total) * TOLERANCIA_PCT;
}

/** Compara la suma de movimientos con los totales del resumen del banco: ±1 % o ±$50. */
export function evaluarCuadre(movs: MovimientoNormalizado[], resumen: Pick<ResumenEstado, 'totalCargosCentavos' | 'totalAbonosCentavos'>): ResultadoCuadre {
  const cargos = movs.filter((m) => !m.esAbono).reduce((s, m) => s + m.montoCentavos, 0);
  const abonos = movs.filter((m) => m.esAbono).reduce((s, m) => s + m.montoCentavos, 0);
  const c = cuadra(cargos, resumen.totalCargosCentavos);
  const a = cuadra(abonos, resumen.totalAbonosCentavos);
  const cuadre: Cuadre = c == null && a == null ? 'sin_resumen' : c === false || a === false ? 'sin_cuadre' : 'ok';
  return {
    cuadre,
    cargosCentavos: cargos,
    abonosCentavos: abonos,
    diferenciaCargosCentavos: resumen.totalCargosCentavos == null ? null : cargos - resumen.totalCargosCentavos,
    diferenciaAbonosCentavos: resumen.totalAbonosCentavos == null ? null : abonos - resumen.totalAbonosCentavos,
  };
}
