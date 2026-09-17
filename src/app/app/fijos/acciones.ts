'use server';

import { revalidatePath } from 'next/cache';
import { contexto } from '@/lib/data/contexto';
import type { Frecuencia, TipoRecurrente } from '@/lib/domain/tipos';
import { COMERCIOS } from '@/lib/domain/comercios';
import { normalizar } from '@/lib/domain/categorizar';
import { registrar } from '@/lib/services/analytics';

type R = { ok: true; id?: string } | { ok: false; error: string };

function revalidar() {
  for (const p of ['/app', '/app/fijos', '/app/presupuesto', '/app/insights']) revalidatePath(p);
}

export async function crearRecurrente(datos: { nombre: string; monto: number; diaCobro: number; tipo: TipoRecurrente; frecuencia?: Frecuencia; cuentaId?: string | null; msiCuotasTotal?: number | null; msiCuotasPagadas?: number | null }): Promise<R> {
  const { usuario, repo } = await contexto();
  if (!datos.nombre.trim() || !(datos.monto > 0) || !(datos.diaCobro >= 1 && datos.diaCobro <= 31)) return { ok: false, error: 'Revisa nombre, monto y día de cobro.' };
  const n = normalizar(datos.nombre);
  const conocido = COMERCIOS.find((c) => n.includes(c.patron));
  const hoy = new Date();
  const restantes = datos.tipo === 'msi' && datos.msiCuotasTotal ? Math.max(0, datos.msiCuotasTotal - (datos.msiCuotasPagadas ?? 0)) : 0;
  const termina = new Date(hoy.getFullYear(), hoy.getMonth() + restantes, datos.diaCobro);
  const r = await repo.guardarRecurrente(usuario.id, {
    nombre: datos.nombre.trim(),
    comercioDominio: conocido?.dominio ?? null,
    tipo: datos.tipo,
    monto: datos.monto,
    diaCobro: datos.diaCobro,
    frecuencia: datos.frecuencia ?? 'mensual',
    veces: datos.msiCuotasPagadas ?? 1,
    activo: true,
    cuentaId: datos.cuentaId ?? null,
    msiCuotasTotal: datos.tipo === 'msi' ? datos.msiCuotasTotal ?? null : null,
    msiCuotasPagadas: datos.tipo === 'msi' ? datos.msiCuotasPagadas ?? null : null,
    msiTermina: datos.tipo === 'msi' ? termina.toISOString().slice(0, 10) : null,
    categoriaId: datos.tipo === 'msi' ? 'msi' : datos.tipo === 'suscripcion' ? 'suscripciones' : datos.tipo === 'colegiatura' ? 'colegiaturas' : datos.tipo === 'servicio' ? 'servicios' : 'fijos',
    origen: 'manual',
  });
  revalidar();
  return { ok: true, id: r.id };
}

/** El usuario ya canceló por su cuenta (cancelación guiada): la marcamos y dejamos de contarla. */
export async function marcarCancelada(recurrenteId: string): Promise<R> {
  const { usuario, repo } = await contexto();
  const r = (await repo.recurrentes(usuario.id)).find((x) => x.id === recurrenteId);
  if (!r) return { ok: false, error: 'No encontramos la suscripción.' };
  await repo.guardarRecurrente(usuario.id, { ...r, activo: false, canceladoAt: new Date().toISOString() });
  await registrar(repo, usuario.id, 'suscripcion_cancelada', { recurrenteId, mensual: r.monto });
  revalidar();
  return { ok: true };
}

/** "Cancelar por mí": abre un ticket para el equipo. */
export async function solicitarCancelacion(recurrenteId: string, notas?: string): Promise<R> {
  const { usuario, repo } = await contexto();
  const r = (await repo.recurrentes(usuario.id)).find((x) => x.id === recurrenteId);
  if (!r) return { ok: false, error: 'No encontramos la suscripción.' };
  const t = await repo.crearSolicitudCancelacion(usuario.id, recurrenteId, notas);
  await registrar(repo, usuario.id, 'cancelar_por_mi', { recurrenteId, nombre: r.nombre });
  return { ok: true, id: t.id };
}

export async function eliminarRecurrente(recurrenteId: string): Promise<R> {
  const { usuario, repo } = await contexto();
  await repo.eliminarRecurrente(usuario.id, recurrenteId);
  revalidar();
  return { ok: true };
}

export async function crearEvento(datos: { fecha: string; nombre: string; monto?: number | null; tipo: 'cargo' | 'recordatorio' | 'pago'; recurrenteId?: string | null }): Promise<R> {
  const { usuario, repo } = await contexto();
  if (!datos.nombre.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(datos.fecha)) return { ok: false, error: 'Escribe un nombre y una fecha.' };
  const e = await repo.guardarEvento(usuario.id, { fecha: datos.fecha, nombre: datos.nombre.trim(), monto: datos.monto ?? null, tipo: datos.tipo, recurrenteId: datos.recurrenteId ?? null });
  revalidar();
  return { ok: true, id: e.id };
}

export async function eliminarEvento(id: string): Promise<R> {
  const { usuario, repo } = await contexto();
  await repo.eliminarEvento(usuario.id, id);
  revalidar();
  return { ok: true };
}
