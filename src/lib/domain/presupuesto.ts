// Propuesta automática de presupuesto y cálculo de Presupuesto vs Actual.

import { costoMensual } from './recurrentes';
import { diasDelRango, diasRestantes, enRango, ultimosPeriodos, vecesPorPeriodo, type Rango, puedesInvertir } from './quincena';
import type { LineaPresupuesto, Movimiento, Periodo, Recurrente } from './tipos';

export type LineaVsActual = {
  categoriaId: string;
  nombre?: string | null;
  limite: number;
  actual: number;
  diferencia: number;
  /** % gastado del límite (puede pasar de 100). */
  pct: number;
  excedido: boolean;
};

export type ResumenPresupuesto = {
  ingreso: number;
  limiteTotal: number;
  gastado: number;
  libres: number;
  pctGastado: number;
  porDia: number;
  diasRestantes: number;
  lineas: LineaVsActual[];
};

const CATEGORIAS_GASTO_VARIABLE = ['comida', 'super', 'transporte', 'online', 'entretenimiento', 'salud', 'hogar', 'viajes', 'otros'];

function redondear(x: number, a = 50): number {
  return Math.max(0, Math.round(x / a) * a);
}

/**
 * Propone líneas de presupuesto para un periodo:
 * - fijos y suscripciones y MSI: lo que ya sabemos que se cobra (prorrateado al periodo);
 * - variables: promedio de los últimos 3 periodos por categoría, redondeado a $50.
 */
export function proponerPresupuesto(movs: Movimiento[], recurrentes: Recurrente[], periodo: Periodo, hoy = new Date(), diasPago: number[] = [5, 20]): Omit<LineaPresupuesto, 'id'>[] {
  const activos = recurrentes.filter((r) => r.activo);
  const factor = vecesPorPeriodo('mensual', periodo);
  const fijos = activos.filter((r) => r.tipo === 'servicio' || r.tipo === 'colegiatura' || r.tipo === 'otro').reduce((s, r) => s + costoMensual(r), 0) * factor;
  const suscripciones = activos.filter((r) => r.tipo === 'suscripcion').reduce((s, r) => s + costoMensual(r), 0) * factor;
  const msi = activos.filter((r) => r.tipo === 'msi').reduce((s, r) => s + r.monto, 0) * factor;

  const lineas: Omit<LineaPresupuesto, 'id'>[] = [];
  let orden = 1;
  if (fijos > 0) lineas.push({ categoriaId: 'fijos', nombre: 'Fijos', limite: redondear(fijos), orden: orden++ });
  if (suscripciones > 0) lineas.push({ categoriaId: 'suscripciones', nombre: 'Suscripciones', limite: redondear(suscripciones), orden: orden++ });
  if (msi > 0) lineas.push({ categoriaId: 'msi', nombre: 'Meses sin intereses', limite: redondear(msi), orden: orden++ });

  // Variables: promedio de periodos anteriores completos (excluye el actual, que va a medias).
  const anteriores = ultimosPeriodos(periodo, 4, hoy, diasPago).slice(0, 3);
  const recurrentesIds = new Set(activos.flatMap(() => [])); // los movimientos de fijos se excluyen por categoría abajo
  void recurrentesIds;
  for (const cat of CATEGORIAS_GASTO_VARIABLE) {
    const totales = anteriores.map((r) => movs.filter((m) => m.tipo === 'gasto' && m.categoriaId === cat && !m.recurrenteId && enRango(m.fecha, r)).reduce((s, m) => s + m.monto, 0));
    const conDatos = totales.filter((t) => t > 0);
    if (!conDatos.length) continue;
    const prom = conDatos.reduce((s, t) => s + t, 0) / conDatos.length;
    lineas.push({ categoriaId: cat, limite: redondear(prom), orden: orden++ });
  }
  return lineas;
}

/** Compara líneas de presupuesto contra el gasto real del rango. */
export function presupuestoVsActual(lineas: LineaPresupuesto[] | Omit<LineaPresupuesto, 'id'>[], movs: Movimiento[], rango: Rango, ingreso: number, hoy = new Date()): ResumenPresupuesto {
  const enPeriodo = movs.filter((m) => m.tipo === 'gasto' && enRango(m.fecha, rango));
  const porCategoria = new Map<string, number>();
  for (const m of enPeriodo) {
    // Fijos agrupan servicios/colegiaturas/otros recurrentes; el resto va por su categoría.
    const cat = m.recurrenteId && !['suscripciones', 'msi'].includes(m.categoriaId) ? 'fijos' : m.categoriaId;
    porCategoria.set(cat, (porCategoria.get(cat) ?? 0) + m.monto);
  }
  const out: LineaVsActual[] = lineas.map((l) => {
    const actual = porCategoria.get(l.categoriaId) ?? 0;
    return { categoriaId: l.categoriaId, nombre: l.nombre ?? null, limite: l.limite, actual, diferencia: l.limite - actual, pct: l.limite > 0 ? (actual / l.limite) * 100 : actual > 0 ? 100 : 0, excedido: actual > l.limite };
  });
  const limiteTotal = out.reduce((s, l) => s + l.limite, 0);
  const gastado = enPeriodo.reduce((s, m) => s + m.monto, 0);
  const restantes = diasRestantes(rango, hoy);
  const libres = Math.max(0, limiteTotal - gastado);
  return {
    ingreso,
    limiteTotal,
    gastado,
    libres: limiteTotal - gastado,
    pctGastado: limiteTotal > 0 ? (gastado / limiteTotal) * 100 : 0,
    porDia: restantes > 0 ? libres / restantes : 0,
    diasRestantes: restantes,
    lineas: out,
  };
}

/** "Puedes invertir $X": ingreso del periodo − fijos/MSI/suscripciones prorrateados − gasto variable promedio del periodo. */
export function excedenteInvertible(ingresoPeriodo: number, lineas: Omit<LineaPresupuesto, 'id'>[]): number {
  const suma = (ids: string[]) => lineas.filter((l) => ids.includes(l.categoriaId)).reduce((s, l) => s + l.limite, 0);
  const fijos = suma(['fijos']);
  const msi = suma(['msi']);
  const suscripciones = suma(['suscripciones']);
  const gastoHabitual = lineas.reduce((s, l) => s + l.limite, 0) - fijos - msi - suscripciones;
  return puedesInvertir({ ingreso: ingresoPeriodo, fijos, msi, suscripciones, gastoHabitual });
}

export function gastoPorDia(rango: Rango, gastado: number): number {
  return gastado / diasDelRango(rango);
}
