// Pipeline de ingesta: cualquier fuente (Belvo, importación, Gmail, manual) pasa por aquí.
// crudo → categorizar (correcciones del usuario → reglas → catálogo → proveedor → LLM) → deduplicar por hash → guardar
// → nómina → re-detectar recurrentes/MSI → regenerar insights.

import { categorizar, hashMovimiento, normalizar } from '@/lib/domain/categorizar';
import { detectarRecurrentes } from '@/lib/domain/recurrentes';
import { generarInsights } from '@/lib/domain/insights';
import { detectarDiasPago, detectarNomina, estimarIngresoQuincenal } from '@/lib/domain/nomina';
import { excedenteInvertible, proponerPresupuesto, presupuestoVsActual } from '@/lib/domain/presupuesto';
import { quincenaDe } from '@/lib/domain/quincena';
import type { Cuenta, FuenteDato, MovimientoCrudo } from '@/lib/domain/tipos';
import type { NuevoMovimiento, Repo } from '@/lib/data/repo';
import { categorizarConLLM } from './llm';

export { estimarIngresoQuincenal };

export type ResultadoIngesta = { insertados: number; duplicados: number; recurrentes: number; insights: number };

/** Categoriza y guarda movimientos crudos de una cuenta. Con `recalcular: false` solo guarda (para lotes). */
export async function ingerirMovimientos(repo: Repo, userId: string, cuenta: Cuenta, crudos: MovimientoCrudo[], fuente: FuenteDato, opciones: { recalcular?: boolean } = {}): Promise<ResultadoIngesta> {
  const correcciones = await repo.correccionesComercio(userId);
  const nuevos: NuevoMovimiento[] = [];
  const desconocidos: { idx: number; descripcion: string }[] = [];

  for (const c of crudos) {
    const hash = hashMovimiento(cuenta.id, c.fecha, c.descripcion, c.monto, c.esAbono, c.repeticion ?? 0);
    const n = normalizar(c.descripcion);
    const corr = correcciones.find((x) => n.includes(x.patron));
    const cat = categorizar(c, cuenta.tipo);
    const mov: NuevoMovimiento = {
      cuentaId: cuenta.id,
      fecha: c.fecha,
      descripcionRaw: c.descripcion,
      comercio: corr?.nombre ?? cat.comercio,
      comercioDominio: corr?.dominio ?? cat.comercioDominio,
      monto: c.monto,
      tipo: cat.tipo,
      categoriaId: corr?.categoriaId ?? cat.categoriaId,
      categoriaFuente: corr ? 'usuario' : cat.categoriaFuente,
      esMsi: cat.esMsi,
      msiCuota: cat.msiCuota,
      msiTotal: cat.msiTotal,
      fuente,
      hash,
    };
    if (!corr && cat.desconocido) desconocidos.push({ idx: nuevos.length, descripcion: c.descripcion });
    nuevos.push(mov);
  }

  // LLM solo para lo que nadie reconoció (una llamada por lote).
  if (desconocidos.length) {
    const resultado = await categorizarConLLM(desconocidos.map((d) => d.descripcion));
    const porDesc = new Map((resultado ?? []).map((r) => [r.descripcion, r]));
    const sinCategoria: { descriptor: string; comercioLlm?: string | null; categoriaLlm?: string | null }[] = [];
    for (const d of desconocidos) {
      const r = porDesc.get(d.descripcion);
      const m = nuevos[d.idx];
      sinCategoria.push({ descriptor: normalizar(d.descripcion).slice(0, 120), comercioLlm: r?.comercio ?? null, categoriaLlm: r?.categoria ?? null });
      if (!r) continue;
      m.comercio = r.comercio || m.comercio;
      m.comercioDominio = r.dominio || null;
      m.categoriaId = r.suscripcion && !m.esMsi && m.tipo === 'gasto' ? 'suscripciones' : r.categoria;
      m.categoriaFuente = 'llm';
      if (['nomina', 'ingreso', 'rendimiento'].includes(r.categoria)) m.tipo = 'ingreso';
      else if (['pago_tarjeta'].includes(r.categoria)) m.tipo = 'pago_tarjeta';
      else if (['transferencia', 'inversion'].includes(r.categoria)) m.tipo = 'transferencia';
    }
    await repo.registrarDescriptoresSinCategoria(userId, sinCategoria).catch(() => undefined);
  }

  const insertados = await repo.insertarMovimientos(userId, nuevos);
  const duplicados = nuevos.length - insertados.length;
  if (opciones.recalcular === false) return { insertados: insertados.length, duplicados, recurrentes: 0, insights: 0 };
  const { recurrentes, insights } = await recalcular(repo, userId);
  return { insertados: insertados.length, duplicados, recurrentes, insights };
}

/** Re-detecta nómina, recurrentes e insights con todo el historial del usuario. Idempotente. */
export async function recalcular(repo: Repo, userId: string): Promise<{ recurrentes: number; insights: number }> {
  const [movsIniciales, perfil] = await Promise.all([repo.movimientos(userId), repo.perfil(userId)]);

  // Depósitos que se comportan como sueldo aunque el banco no los etiquete.
  const nominaIds = detectarNomina(movsIniciales);
  for (const id of nominaIds) await repo.actualizarMovimiento(userId, id, { categoriaId: 'nomina', comercio: 'Nómina', tipo: 'ingreso' });
  const movs = nominaIds.length ? await repo.movimientos(userId) : movsIniciales;

  const detectados = detectarRecurrentes(movs);
  const recurrentes = await repo.conciliarRecurrentes(userId, detectados);

  const diasPago = perfil?.diasPago ?? [5, 20];
  const hoy = new Date();
  const rango = quincenaDe(hoy, diasPago);
  const movsConRec = await repo.movimientos(userId);
  const ingresoPeriodo = perfil?.ingresoQuincenal ?? estimarIngresoQuincenal(movsConRec, hoy);
  const lineas = proponerPresupuesto(movsConRec, recurrentes, 'q', hoy, diasPago);
  const excedente = excedenteInvertible(ingresoPeriodo, lineas);
  const guardado = await repo.presupuesto(userId, 'q', rango.inicio).catch(() => null);
  const vs = presupuestoVsActual(guardado?.lineas ?? lineas, movsConRec, rango, ingresoPeriodo, hoy);
  const candidatos = generarInsights({ movs: movsConRec, recurrentes, rango, ingresoPeriodo, excedente, hoy, presupuesto: { lineas: vs.lineas, diasRestantes: vs.diasRestantes } });
  const nuevos = await repo.guardarInsights(userId, candidatos);
  return { recurrentes: recurrentes.filter((r) => r.activo).length, insights: nuevos.length };
}

export type PropuestaQuincena = { dias: number[]; depositos: number; ingresoQuincenal: number; actual: number[]; esDistinta: boolean };

/** Días de quincena e ingreso que sugieren los depósitos de nómina del usuario. null si no hay nómina suficiente. */
export async function propuestaQuincena(repo: Repo, userId: string): Promise<PropuestaQuincena | null> {
  const [movs, perfil] = await Promise.all([repo.movimientos(userId), repo.perfil(userId)]);
  const d = detectarDiasPago(movs);
  if (!d) return null;
  const actual = perfil?.diasPago ?? [5, 20];
  return { dias: d.dias, depositos: d.depositos, ingresoQuincenal: estimarIngresoQuincenal(movs), actual, esDistinta: d.dias.join(',') !== actual.join(',') };
}
