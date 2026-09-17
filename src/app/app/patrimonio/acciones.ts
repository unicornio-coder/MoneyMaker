'use server';

import { revalidatePath } from 'next/cache';
import { contexto } from '@/lib/data/contexto';
import type { Activo, Pasivo } from '@/lib/domain/tipos';

type R = { ok: true } | { ok: false; error: string };
const rev = () => ['/app/patrimonio', '/app/inversiones', '/app'].forEach((p) => revalidatePath(p));

export async function guardarActivo(a: { id?: string; tipo: Activo['tipo']; nombre: string; valor: number; detalle?: Record<string, unknown> }): Promise<R> {
  const { usuario, repo } = await contexto();
  if (!a.nombre.trim() || !(a.valor >= 0)) return { ok: false, error: 'Escribe un nombre y un valor.' };
  await repo.guardarActivo(usuario.id, { id: a.id, tipo: a.tipo, nombre: a.nombre.trim(), valor: Math.round(a.valor), detalle: a.detalle ?? {} });
  rev();
  return { ok: true };
}

export async function eliminarActivo(id: string): Promise<R> {
  const { usuario, repo } = await contexto();
  await repo.eliminarActivo(usuario.id, id);
  rev();
  return { ok: true };
}

export async function guardarPasivo(p: { id?: string; tipo: Pasivo['tipo']; nombre: string; saldo: number; tasa?: number | null }): Promise<R> {
  const { usuario, repo } = await contexto();
  if (!p.nombre.trim() || !(p.saldo >= 0)) return { ok: false, error: 'Escribe un nombre y un saldo.' };
  await repo.guardarPasivo(usuario.id, { id: p.id, tipo: p.tipo, nombre: p.nombre.trim(), saldo: Math.round(p.saldo), tasa: p.tasa ?? null });
  rev();
  return { ok: true };
}

export async function eliminarPasivo(id: string): Promise<R> {
  const { usuario, repo } = await contexto();
  await repo.eliminarPasivo(usuario.id, id);
  rev();
  return { ok: true };
}
