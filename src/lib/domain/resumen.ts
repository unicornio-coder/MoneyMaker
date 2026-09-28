// Resumen semanal (correo del domingo) y avisos de cobros próximos. Lógica pura, sin I/O.

import type { Movimiento, Recurrente } from './tipos';
import { aISO, sumarDias } from './fechas';
import { cobrosProximos, type CobroProximo } from './recurrentes';

export type ResumenSemanal = {
  desde: string;
  hasta: string;
  gasto: number;
  gastoAnterior: number;
  /** Porcentaje contra la semana anterior; null si no hay con qué comparar. */
  variacion: number | null;
  movimientos: number;
  topCategorias: { categoriaId: string; monto: number }[];
  mayorGasto: { comercio: string; monto: number; fecha: string } | null;
  proximos: { lista: CobroProximo[]; total: number };
  /** Suscripciones detectadas cuyo primer cargo cayó esta semana (recién aparecidas). */
  suscripcionesNuevas: Recurrente[];
};

const esGasto = (m: Movimiento) => m.tipo === 'gasto';

/** Semana cerrada: los 7 días que terminan en `hoy` (domingo → de lunes a domingo). */
export function resumenSemanal(movimientos: Movimiento[], recurrentes: Recurrente[], hoy: Date): ResumenSemanal {
  const hasta = aISO(hoy);
  const desde = aISO(sumarDias(hoy, -6));
  const desdeAnt = aISO(sumarDias(hoy, -13));
  const hastaAnt = aISO(sumarDias(hoy, -7));
  const semana = movimientos.filter((m) => esGasto(m) && m.fecha >= desde && m.fecha <= hasta);
  const anterior = movimientos.filter((m) => esGasto(m) && m.fecha >= desdeAnt && m.fecha <= hastaAnt);
  const gasto = semana.reduce((s, m) => s + m.monto, 0);
  const gastoAnterior = anterior.reduce((s, m) => s + m.monto, 0);
  const porCat = new Map<string, number>();
  for (const m of semana) porCat.set(m.categoriaId, (porCat.get(m.categoriaId) ?? 0) + m.monto);
  const topCategorias = [...porCat.entries()].map(([categoriaId, monto]) => ({ categoriaId, monto })).sort((a, b) => b.monto - a.monto).slice(0, 3);
  const mayor = semana.reduce<Movimiento | null>((mx, m) => (!mx || m.monto > mx.monto ? m : mx), null);
  return {
    desde,
    hasta,
    gasto,
    gastoAnterior,
    variacion: gastoAnterior > 0 ? Math.round(((gasto - gastoAnterior) / gastoAnterior) * 100) : null,
    movimientos: semana.length,
    topCategorias,
    mayorGasto: mayor ? { comercio: mayor.comercio, monto: mayor.monto, fecha: mayor.fecha } : null,
    proximos: cobrosProximos(recurrentes, sumarDias(hoy, 1), 7),
    suscripcionesNuevas: recurrentes.filter((r) => r.activo && r.tipo === 'suscripcion' && r.origen === 'detectado' && r.veces <= 1 && (r.primerCargo ?? '') >= desde),
  };
}

export type AvisoCobro = { recurrente: Recurrente; fecha: string; monto: number; en: 'manana' | 'tres_dias' };

/** Cobros que caen mañana o en 3 días: un aviso por cobro, sin repetir cada día. */
export function avisosDeCobros(recurrentes: Recurrente[], hoy: Date): AvisoCobro[] {
  const manana = aISO(sumarDias(hoy, 1));
  const tres = aISO(sumarDias(hoy, 3));
  const { lista } = cobrosProximos(recurrentes, hoy, 4);
  const out: AvisoCobro[] = [];
  for (const c of lista) {
    if (c.fecha === manana) out.push({ ...c, en: 'manana' });
    else if (c.fecha === tres) out.push({ ...c, en: 'tres_dias' });
  }
  return out;
}

/** Texto corto para la notificación: "Mañana: Netflix $219 · En 3 días: Spotify $115". */
export function textoAvisos(avisos: AvisoCobro[], mxn: (n: number) => string): string {
  const parte = (en: AvisoCobro['en']) =>
    avisos
      .filter((a) => a.en === en)
      .map((a) => `${a.recurrente.nombre} ${mxn(a.monto)}`)
      .join(', ');
  const m = parte('manana');
  const t = parte('tres_dias');
  return [m && `Mañana: ${m}`, t && `En 3 días: ${t}`].filter(Boolean).join(' · ');
}
