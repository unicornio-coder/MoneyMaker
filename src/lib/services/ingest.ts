// Pipeline de ingesta: cualquier fuente (Belvo, importación, Gmail, manual) pasa por aquí.
// crudo → categorizar (correcciones del usuario → reglas → proveedor → LLM) → deduplicar por hash → guardar
// → re-detectar recurrentes/MSI → regenerar insights.

import { categorizar, hashMovimiento, normalizar } from '@/lib/domain/categorizar';
import { detectarRecurrentes } from '@/lib/domain/recurrentes';
import { generarInsights } from '@/lib/domain/insights';
import { excedenteInvertible, proponerPresupuesto } from '@/lib/domain/presupuesto';
import { quincenaDe } from '@/lib/domain/quincena';
import type { Cuenta, FuenteDato, Movimiento, MovimientoCrudo } from '@/lib/domain/tipos';
import type { NuevoMovimiento, Repo } from '@/lib/data/repo';
import { categorizarConLLM } from './llm';

export type ResultadoIngesta = { insertados: number; duplicados: number; recurrentes: number; insights: number };

/** Categoriza y guarda movimientos crudos de una cuenta. */
export async function ingerirMovimientos(repo: Repo, userId: string, cuenta: Cuenta, crudos: MovimientoCrudo[], fuente: FuenteDato): Promise<ResultadoIngesta> {
  const correcciones = await repo.correccionesComercio(userId);
  const nuevos: NuevoMovimiento[] = [];
  const desconocidos: { idx: number; descripcion: string }[] = [];

  for (const c of crudos) {
    const hash = hashMovimiento(cuenta.id, c.fecha, c.descripcion, c.monto, c.esAbono);
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
    if (resultado) {
      const porDesc = new Map(resultado.map((r) => [r.descripcion, r]));
      for (const d of desconocidos) {
        const r = porDesc.get(d.descripcion);
        if (!r) continue;
        const m = nuevos[d.idx];
        m.comercio = r.comercio || m.comercio;
        m.comercioDominio = r.dominio || null;
        m.categoriaId = r.categoria;
        m.categoriaFuente = 'llm';
        if (['nomina', 'ingreso', 'rendimiento'].includes(r.categoria)) m.tipo = 'ingreso';
        else if (['pago_tarjeta'].includes(r.categoria)) m.tipo = 'pago_tarjeta';
        else if (['transferencia', 'inversion'].includes(r.categoria)) m.tipo = 'transferencia';
      }
    }
  }

  const insertados = await repo.insertarMovimientos(userId, nuevos);
  const { recurrentes, insights } = await recalcular(repo, userId);
  return { insertados: insertados.length, duplicados: nuevos.length - insertados.length, recurrentes, insights };
}

/** Re-detecta recurrentes e insights con todo el historial del usuario. Idempotente. */
export async function recalcular(repo: Repo, userId: string): Promise<{ recurrentes: number; insights: number }> {
  const [movs, perfil] = await Promise.all([repo.movimientos(userId), repo.perfil(userId)]);
  const detectados = detectarRecurrentes(movs);
  const recurrentes = await repo.conciliarRecurrentes(userId, detectados);

  const diasPago = perfil?.diasPago ?? [5, 20];
  const hoy = new Date();
  const rango = quincenaDe(hoy, diasPago);
  const movsConRec = await repo.movimientos(userId);
  const ingresoPeriodo = perfil?.ingresoQuincenal ?? estimarIngresoQuincenal(movsConRec);
  const lineas = proponerPresupuesto(movsConRec, recurrentes, 'q', hoy, diasPago);
  const excedente = excedenteInvertible(ingresoPeriodo, lineas);
  const candidatos = generarInsights({ movs: movsConRec, recurrentes, rango, ingresoPeriodo, excedente, hoy });
  const nuevos = await repo.guardarInsights(userId, candidatos);
  return { recurrentes: recurrentes.filter((r) => r.activo).length, insights: nuevos.length };
}

/** Ingreso quincenal estimado: mediana de las nóminas de los últimos 90 días, o 0. */
export function estimarIngresoQuincenal(movs: Movimiento[]): number {
  const desde = new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10);
  const nominas = movs.filter((m) => m.categoriaId === 'nomina' && m.fecha >= desde).map((m) => m.monto).sort((a, b) => a - b);
  if (!nominas.length) return 0;
  return nominas[Math.floor(nominas.length / 2)];
}
