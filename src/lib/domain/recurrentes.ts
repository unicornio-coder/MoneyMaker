// Detección de gastos fijos: suscripciones, servicios, colegiaturas y meses sin intereses.
// Entrada: movimientos ya categorizados. Salida: recurrentes candidatos (sin id) listos para guardar/reconciliar.

import { deISO, diasEntre, sumarMeses, aISO } from './fechas';
import { COMERCIOS } from './comercios';
import { normalizar } from './categorizar';
import type { Frecuencia, Movimiento, Recurrente, TipoRecurrente } from './tipos';

export type RecurrenteDetectado = Omit<Recurrente, 'id'> & { movimientoIds: string[]; clave: string };

const SUSCRIPCION_SET = new Set(COMERCIOS.filter((c) => c.suscripcion).map((c) => c.nombre));
const SERVICIO_SET = new Set(COMERCIOS.filter((c) => c.servicio).map((c) => c.nombre));

/** Clave de agrupación: comercio normalizado + cuenta. Para MSI se agrega el total de cuotas. */
export function claveRecurrente(m: Movimiento): string {
  const base = `${m.cuentaId}|${normalizar(m.comercio).replace(/\s/g, '')}`;
  return m.esMsi && m.msiTotal ? `${base}|msi${m.msiTotal}|${Math.round(m.monto)}` : base;
}

function mediana(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function frecuenciaDe(intervaloDias: number): Frecuencia | null {
  if (intervaloDias >= 6 && intervaloDias <= 8) return 'semanal';
  if (intervaloDias >= 13 && intervaloDias <= 17) return 'quincenal';
  if (intervaloDias >= 26 && intervaloDias <= 35) return 'mensual';
  if (intervaloDias >= 355 && intervaloDias <= 375) return 'anual';
  return null;
}

/**
 * Frecuencia dominante de una serie de fechas. Un intervalo del doble (mes saltado, cargo fallido y
 * reintentado al mes siguiente) cuenta para la misma frecuencia.
 */
function frecuenciaDeSerie(fechasISO: string[]): Frecuencia | null {
  if (fechasISO.length < 2) return null;
  const intervalos = fechasISO.slice(1).map((f, i) => diasEntre(deISO(fechasISO[i]), deISO(f)));
  const votos = new Map<Frecuencia, number>();
  for (const d of intervalos) {
    const f = frecuenciaDe(d) ?? frecuenciaDe(d / 2);
    if (f) votos.set(f, (votos.get(f) ?? 0) + 1);
  }
  if (!votos.size) return null;
  const [mejor, n] = [...votos.entries()].sort((a, b) => b[1] - a[1])[0];
  // Más de la mitad de los intervalos deben encajar; con dos cargos basta uno.
  return n * 2 >= intervalos.length ? mejor : null;
}

/**
 * Montos compatibles: todos dentro de ±10 % de la mediana, o cada uno dentro de ±15 % del anterior
 * (una suscripción que sube de precio sigue siendo la misma suscripción).
 */
function montosParecidos(montos: number[], tolerancia = 0.1): boolean {
  const med = mediana(montos);
  if (med === 0) return false;
  if (montos.every((x) => Math.abs(x - med) / med <= tolerancia)) return true;
  return montos.slice(1).every((x, i) => montos[i] > 0 && Math.abs(x - montos[i]) / montos[i] <= 0.15);
}

function mesesDistintos(fechasISO: string[]): number {
  return new Set(fechasISO.map((f) => f.slice(0, 7))).size;
}

function tipoDe(m: Movimiento): TipoRecurrente {
  if (m.esMsi) return 'msi';
  if (m.categoriaId === 'colegiaturas') return 'colegiatura';
  if (SUSCRIPCION_SET.has(m.comercio) || m.categoriaId === 'suscripciones') return 'suscripcion';
  if (SERVICIO_SET.has(m.comercio) || m.categoriaId === 'servicios' || m.categoriaId === 'fijos') return 'servicio';
  return 'otro';
}

/**
 * Detecta recurrentes a partir de movimientos de gasto.
 * - MSI: con un solo cargo basta (la descripción ya dice cuota X de N).
 * - Suscripción/servicio conocido: con un solo cargo se propone (veces=1); la app lo marca como "nuevo".
 * - Cualquier otro comercio: necesita ≥ 2 cargos con cadencia regular y montos parecidos.
 */
export function detectarRecurrentes(movs: Movimiento[], hoy = new Date()): RecurrenteDetectado[] {
  const gastos = movs.filter((m) => m.tipo === 'gasto' && m.categoriaId !== 'efectivo' && m.categoriaId !== 'comisiones');
  const grupos = new Map<string, Movimiento[]>();
  for (const m of gastos) {
    const k = claveRecurrente(m);
    grupos.set(k, [...(grupos.get(k) ?? []), m]);
  }
  // Horizonte de datos por cuenta: con estados de cuenta, lo último que sabemos es la fecha del último movimiento,
  // no hoy. Un cargo se considera vigente si está dentro de la ventana respecto a ese horizonte.
  const horizonte = new Map<string, Date>();
  for (const m of movs) {
    const f = deISO(m.fecha);
    const h = horizonte.get(m.cuentaId);
    if (!h || f > h) horizonte.set(m.cuentaId, f);
  }
  const referencia = (cuentaId: string): Date => {
    const h = horizonte.get(cuentaId);
    return h && h < hoy ? h : hoy;
  };

  const out: RecurrenteDetectado[] = [];
  for (const [clave, lista] of grupos) {
    const orden = [...lista].sort((a, b) => a.fecha.localeCompare(b.fecha));
    const ultimo = orden[orden.length - 1];
    const primero = orden[0];
    const tipo = tipoDe(ultimo);
    const montos = orden.map((m) => m.monto);

    if (tipo === 'msi') {
      const total = ultimo.msiTotal ?? 0;
      const pagadas = ultimo.msiCuota ?? orden.length;
      const restantes = Math.max(0, total - pagadas);
      const termina = sumarMeses(deISO(ultimo.fecha), restantes);
      out.push({
        clave,
        cuentaId: ultimo.cuentaId,
        nombre: ultimo.comercio,
        comercioDominio: ultimo.comercioDominio ?? null,
        tipo: 'msi',
        monto: mediana(montos),
        diaCobro: deISO(ultimo.fecha).getDate(),
        frecuencia: 'mensual',
        primerCargo: primero.fecha,
        ultimoCargo: ultimo.fecha,
        veces: orden.length,
        activo: restantes > 0,
        msiCuotasTotal: total || null,
        msiCuotasPagadas: pagadas || null,
        msiTermina: aISO(termina),
        categoriaId: 'msi',
        origen: 'detectado',
        movimientoIds: orden.map((m) => m.id),
      });
      continue;
    }

    let frecuencia: Frecuencia | null = null;
    if (orden.length >= 2) {
      frecuencia = frecuenciaDeSerie(orden.map((m) => m.fecha));
      if (!frecuencia || !montosParecidos(montos)) frecuencia = null;
    }
    const conocido = tipo === 'suscripcion' || tipo === 'servicio' || tipo === 'colegiatura';
    // Suscripción o servicio conocido (o marcado por la IA) visto en dos meses distintos: se confirma aunque la cadencia no sea exacta.
    if (!frecuencia && conocido && orden.length >= 2 && mesesDistintos(orden.map((m) => m.fecha)) >= 2) frecuencia = 'mensual';
    if (!frecuencia && !(conocido && orden.length === 1)) continue;
    if (!frecuencia && conocido && orden.length >= 2) continue; // conocido pero dos cargos en el mismo mes (p. ej. recargas): no es fijo

    const diasDesdeUltimo = diasEntre(deISO(ultimo.fecha), referencia(ultimo.cuentaId));
    const ventana = { semanal: 14, quincenal: 30, mensual: 45, anual: 400 }[frecuencia ?? 'mensual'];
    out.push({
      clave,
      cuentaId: ultimo.cuentaId,
      nombre: ultimo.comercio,
      comercioDominio: ultimo.comercioDominio ?? null,
      tipo,
      // Precio vigente: el último cargo (si la suscripción subió, el presupuesto debe usar el nuevo precio).
      monto: ultimo.monto,
      diaCobro: deISO(ultimo.fecha).getDate(),
      frecuencia: frecuencia ?? 'mensual',
      primerCargo: primero.fecha,
      ultimoCargo: ultimo.fecha,
      veces: orden.length,
      activo: diasDesdeUltimo <= ventana,
      categoriaId: ultimo.categoriaId,
      origen: 'detectado',
      movimientoIds: orden.map((m) => m.id),
    });
  }
  return out.sort((a, b) => b.monto - a.monto);
}

/** Costo mensual equivalente de un recurrente. */
export function costoMensual(r: Pick<Recurrente, 'monto' | 'frecuencia'>): number {
  return r.monto * { semanal: 52 / 12, quincenal: 2, mensual: 1, anual: 1 / 12 }[r.frecuencia];
}

/** Total pagado estimado desde el primer cargo. */
export function totalPagado(r: Pick<Recurrente, 'monto' | 'veces'>): number {
  return r.monto * r.veces;
}

/** Próxima fecha de cobro a partir de hoy. */
export function proximoCobro(r: Pick<Recurrente, 'diaCobro' | 'frecuencia' | 'ultimoCargo'>, hoy = new Date()): Date {
  if (r.frecuencia === 'mensual' || r.frecuencia === 'anual') {
    const dia = r.diaCobro ?? 1;
    let f = new Date(hoy.getFullYear(), hoy.getMonth(), Math.min(dia, new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate()));
    if (f < new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())) f = sumarMeses(f, r.frecuencia === 'anual' ? 12 : 1);
    return f;
  }
  const paso = r.frecuencia === 'semanal' ? 7 : 15;
  let f = r.ultimoCargo ? deISO(r.ultimoCargo) : hoy;
  while (f < new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())) f = new Date(f.getFullYear(), f.getMonth(), f.getDate() + paso);
  return f;
}
