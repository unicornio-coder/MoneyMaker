// Resumen numérico del periodo para los insights con IA. Solo cifras y nombres de categorías o de suscripciones
// conocidas: nunca descripciones crudas del banco, ni correos, ni cuentas. Lógica pura, con test.

import { aISO, sumarDias } from './fechas';
import { categoria } from './categorias';
import { costoMensual, cobrosProximos } from './recurrentes';
import { desplazar, enRango, type Rango } from './quincena';
import type { Movimiento, Recurrente } from './tipos';

export type ResumenIA = {
  periodo: string;
  diasRestantes: number;
  ingreso: number;
  gasto: number;
  gastoAnterior: number;
  categorias: { nombre: string; monto: number; anterior: number }[];
  suscripciones: { nombre: string; mensual: number; meses: number }[];
  presupuesto: { nombre: string; limite: number; actual: number }[];
  proximosCobros: { nombre: string; monto: number; fecha: string }[];
  excedente: number;
};

const CAT_MAX = 8;

export function armarResumenIA(args: { movs: Movimiento[]; recurrentes: Recurrente[]; rango: Rango; diasPago?: number[]; ingresoPeriodo: number; excedente: number; hoy: Date; diasRestantes: number; presupuesto?: { nombre?: string | null; categoriaId: string; limite: number; actual: number }[] | null }): ResumenIA {
  const { movs, recurrentes, rango, hoy } = args;
  const anterior = desplazar(rango, -1, args.diasPago ?? [5, 20]);
  const gastos = movs.filter((m) => m.tipo === 'gasto');
  const enActual = gastos.filter((m) => enRango(m.fecha, rango));
  const enAnterior = gastos.filter((m) => enRango(m.fecha, anterior));
  const suma = (xs: Movimiento[]) => Math.round(xs.reduce((s, m) => s + m.monto, 0));
  const porCat = new Map<string, { monto: number; anterior: number }>();
  for (const m of enActual) porCat.set(m.categoriaId, { monto: (porCat.get(m.categoriaId)?.monto ?? 0) + m.monto, anterior: porCat.get(m.categoriaId)?.anterior ?? 0 });
  for (const m of enAnterior) porCat.set(m.categoriaId, { monto: porCat.get(m.categoriaId)?.monto ?? 0, anterior: (porCat.get(m.categoriaId)?.anterior ?? 0) + m.monto });
  const categorias = [...porCat.entries()]
    .map(([id, v]) => ({ nombre: categoria(id).nombre, monto: Math.round(v.monto), anterior: Math.round(v.anterior) }))
    .sort((a, b) => b.monto - a.monto)
    .slice(0, CAT_MAX);
  const activos = recurrentes.filter((r) => r.activo && !r.canceladoAt);
  const suscripciones = activos
    .filter((r) => r.tipo === 'suscripcion')
    .map((r) => ({ nombre: r.nombre, mensual: Math.round(costoMensual(r)), meses: r.veces }))
    .sort((a, b) => b.mensual - a.mensual)
    .slice(0, 12);
  const proximos = cobrosProximos(activos, hoy, 7).lista.slice(0, 8).map((c) => ({ nombre: c.recurrente.nombre, monto: Math.round(c.monto), fecha: c.fecha }));
  return {
    periodo: rango.etiqueta,
    diasRestantes: args.diasRestantes,
    ingreso: Math.round(args.ingresoPeriodo),
    gasto: suma(enActual),
    gastoAnterior: suma(enAnterior),
    categorias,
    suscripciones,
    presupuesto: (args.presupuesto ?? []).map((l) => ({ nombre: l.nombre ?? categoria(l.categoriaId).nombre, limite: Math.round(l.limite), actual: Math.round(l.actual) })).slice(0, 12),
    proximosCobros: proximos,
    excedente: Math.round(args.excedente),
  };
}

/** Clave de deduplicación: un lote de insights de IA por periodo y por "forma" de los datos (gasto redondeado a $500). */
export function claveResumenIA(r: ResumenIA, inicio: string): string {
  return `ia:${inicio}:${Math.round(r.gasto / 500)}:${r.suscripciones.length}`;
}

/** Fecha límite razonable para mostrar un insight de IA: hasta que termine el periodo. */
export function vigenciaResumenIA(rango: Rango): string {
  return aISO(sumarDias(new Date(rango.fin + 'T12:00:00'), 1));
}
