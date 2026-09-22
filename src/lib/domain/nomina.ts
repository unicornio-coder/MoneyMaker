// Nómina: qué depósitos son sueldo, qué días cae y cuánto entra por quincena. Sin I/O.

import { normalizar } from './categorizar';
import { deISO, diasEntre } from './fechas';
import type { Movimiento } from './tipos';

const RE_ABONO_GENERICO = /\b(RECIBID|DEPOSITO|ABONO|TRANSFERENCIA)/;

function mediana(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Abonos que podrían ser sueldo: ingresos y transferencias recibidas. */
function abonosCandidatos(movs: Movimiento[]): Movimiento[] {
  return movs.filter((m) => m.tipo === 'ingreso' || (m.tipo === 'transferencia' && m.categoriaId === 'transferencia' && RE_ABONO_GENERICO.test(normalizar(m.descripcionRaw))));
}

/** Remitente: descripción sin números ni ruido, para agrupar "SPEI RECIBIDO EMPRESA SA 0012345" con "… 0012399". */
export function remitenteDe(descripcion: string): string {
  return normalizar(descripcion)
    .replace(/\b(SPEI|TRANSFERENCIA|TRANSF|RECIBIDO|RECIBIDA|DEPOSITO|ABONO|DE|DEL|LA|EL|REF|REFERENCIA|CLABE|BANCO|BANORTE|BBVA|SANTANDER|HSBC|BANAMEX|SCOTIABANK)\b/g, ' ')
    .replace(/\b[A-Z]*\d+[A-Z0-9]*\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cadenciaRegular(fechas: string[]): boolean {
  const orden = [...fechas].sort();
  if (orden.length < 2) return false;
  const intervalos = orden.slice(1).map((f, i) => diasEntre(deISO(orden[i]), deISO(f)));
  const med = mediana(intervalos);
  return (med >= 6 && med <= 8) || (med >= 13 && med <= 17) || (med >= 26 && med <= 35);
}

/**
 * Depósitos que son nómina aunque el banco no lo diga: mismo remitente, ≥ 2 veces, montos parecidos (±20 %)
 * y cadencia semanal, quincenal o mensual. Devuelve los ids que hay que reetiquetar como 'nomina'.
 */
export function detectarNomina(movs: Movimiento[]): string[] {
  const grupos = new Map<string, Movimiento[]>();
  for (const m of abonosCandidatos(movs)) {
    if (m.categoriaFuente === 'usuario') continue;
    const k = `${m.cuentaId}|${remitenteDe(m.descripcionRaw) || normalizar(m.comercio)}`;
    grupos.set(k, [...(grupos.get(k) ?? []), m]);
  }
  const ids: string[] = [];
  for (const lista of grupos.values()) {
    if (lista.length < 2) continue;
    const yaNomina = lista.some((m) => m.categoriaId === 'nomina');
    const med = mediana(lista.map((m) => m.monto));
    const parecidos = med > 0 && lista.every((m) => Math.abs(m.monto - med) / med <= 0.2);
    if (!yaNomina && !(parecidos && cadenciaRegular(lista.map((m) => m.fecha)))) continue;
    for (const m of lista) if (m.categoriaId !== 'nomina') ids.push(m.id);
  }
  return ids;
}

export type DiasPagoDetectados = { dias: number[]; depositos: number };

/** Día del mes normalizado: 28–31 se tratan como "fin de mes" (30). */
function diaNormalizado(fechaISO: string): number {
  const d = deISO(fechaISO).getDate();
  return d >= 28 ? 30 : d;
}

/**
 * Propone días de quincena a partir de los depósitos de nómina: agrupa días con ±2 de tolerancia
 * y devuelve uno o dos días. null con menos de dos depósitos o sin patrón.
 */
export function detectarDiasPago(movs: Movimiento[]): DiasPagoDetectados | null {
  const nominas = movs.filter((m) => m.categoriaId === 'nomina');
  if (nominas.length < 2) return null;
  const dias = nominas.map((m) => diaNormalizado(m.fecha)).sort((a, b) => a - b);
  const grupos: number[][] = [];
  for (const d of dias) {
    const g = grupos[grupos.length - 1];
    if (g && d - g[g.length - 1] <= 2) g.push(d);
    else grupos.push([d]);
  }
  // Fin de mes y principio de mes son el mismo ciclo (30 y 1): si hay grupo en 1–2 y otro en 30, se quedan ambos.
  const centros = grupos.map((g) => ({ dia: Math.round(mediana(g)), n: g.length })).sort((a, b) => b.n - a.n);
  const top = centros.slice(0, 2).filter((c, i) => i === 0 || c.n >= 1);
  if (!top.length) return null;
  if (top.length === 2 && Math.abs(top[0].dia - top[1].dia) < 10) top.pop();
  const propuestos = top.map((c) => c.dia).sort((a, b) => a - b);
  if (propuestos.length === 1 && top[0].n < 2) return null;
  return { dias: propuestos, depositos: nominas.length };
}

/** Ingreso quincenal: mediana de los depósitos de nómina de los últimos 6 meses ajustada a cuántos caen por mes. */
export function estimarIngresoQuincenal(movs: Movimiento[], hoy = new Date()): number {
  const desde = new Date(hoy.getFullYear(), hoy.getMonth() - 6, hoy.getDate()).toISOString().slice(0, 10);
  const nominas = movs.filter((m) => m.categoriaId === 'nomina' && m.fecha >= desde);
  if (!nominas.length) return 0;
  const meses = new Set(nominas.map((m) => m.fecha.slice(0, 7))).size || 1;
  const porMes = Math.min(4.5, Math.max(1, nominas.length / meses));
  return Math.round(mediana(nominas.map((m) => m.monto)) * (porMes / 2));
}
