'use server';

import { revalidatePath } from 'next/cache';
import { contexto } from '@/lib/data/contexto';
import type { Periodo } from '@/lib/domain/tipos';
import { rangoDe } from '@/lib/domain/quincena';
import { proponerPresupuesto } from '@/lib/domain/presupuesto';
import { estimarIngresoQuincenal } from '@/lib/services/ingest';

type R = { ok: true } | { ok: false; error: string };

export async function actualizarLimite(presupuestoId: string, categoriaId: string, limite: number): Promise<R> {
  const { usuario, repo } = await contexto();
  if (!(limite >= 0)) return { ok: false, error: 'El límite debe ser cero o mayor.' };
  await repo.actualizarLineaPresupuesto(usuario.id, presupuestoId, categoriaId, Math.round(limite));
  revalidatePath('/app/presupuesto');
  return { ok: true };
}

export async function agregarLinea(periodo: Periodo, inicio: string, categoriaId: string, nombre: string | null, limite: number): Promise<R> {
  const { usuario, repo } = await contexto();
  const p = await repo.presupuesto(usuario.id, periodo, inicio);
  if (!p) return { ok: false, error: 'No encontramos el presupuesto.' };
  if (p.lineas.some((l) => l.categoriaId === categoriaId)) return { ok: false, error: 'Esa categoría ya tiene presupuesto. Edita su monto en la tabla.' };
  await repo.guardarPresupuesto(usuario.id, { periodo, inicio, fin: p.fin, ingreso: p.ingreso, lineas: [...p.lineas.map(({ id: _id, ...l }) => l), { categoriaId, nombre, limite: Math.round(limite), orden: p.lineas.length + 1 }] });
  revalidatePath('/app/presupuesto');
  return { ok: true };
}

/** Vuelve a proponer el presupuesto del periodo con los datos actuales (sobrescribe los montos). */
export async function reproponer(periodo: Periodo, inicio: string): Promise<R> {
  const { usuario, repo, diasPago, perfil } = await contexto();
  const hoy = new Date();
  const rango = rangoDe(periodo, hoy, diasPago);
  if (rango.inicio !== inicio) return { ok: false, error: 'Solo se puede re-proponer el periodo actual.' };
  const [movs, recs] = await Promise.all([repo.movimientos(usuario.id), repo.recurrentes(usuario.id)]);
  const lineas = proponerPresupuesto(movs, recs, periodo, hoy, diasPago);
  const ingresoQ = perfil.ingresoQuincenal ?? estimarIngresoQuincenal(movs);
  const ingreso = periodo === 'q' ? ingresoQ : periodo === 'mes' ? ingresoQ * 2 : ingresoQ * 24;
  await repo.guardarPresupuesto(usuario.id, { periodo, inicio: rango.inicio, fin: rango.fin, ingreso, lineas });
  revalidatePath('/app/presupuesto');
  return { ok: true };
}
