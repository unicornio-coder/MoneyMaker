'use server';

import { revalidatePath } from 'next/cache';
import { contexto } from '@/lib/data/contexto';
import type { Objetivo } from '@/lib/domain/tipos';

type R = { ok: true } | { ok: false; error: string };
const rev = () => ['/app/objetivos', '/app'].forEach((p) => revalidatePath(p));

export async function guardarObjetivo(o: { id?: string; grupo: Objetivo['grupo']; nombre: string; meta: number; avance?: number; fecha?: string | null; cuentaId?: string | null }): Promise<R> {
  const { usuario, repo } = await contexto();
  if (!o.nombre.trim() || !(o.meta > 0)) return { ok: false, error: 'Escribe un nombre y una meta mayor a cero.' };
  const existente = o.id ? (await repo.objetivos(usuario.id)).find((x) => x.id === o.id) : undefined;
  const avance = o.avance ?? existente?.avance ?? 0;
  await repo.guardarObjetivo(usuario.id, { id: o.id, grupo: o.grupo, nombre: o.nombre.trim(), meta: Math.round(o.meta), avance: Math.round(avance), fecha: o.fecha ?? existente?.fecha ?? null, cuentaId: o.cuentaId ?? existente?.cuentaId ?? null, completado: avance >= o.meta || (existente?.completado ?? false) });
  rev();
  return { ok: true };
}

export async function completarObjetivo(id: string, completado: boolean): Promise<R> {
  const { usuario, repo } = await contexto();
  const o = (await repo.objetivos(usuario.id)).find((x) => x.id === id);
  if (!o) return { ok: false, error: 'No encontramos el objetivo.' };
  await repo.guardarObjetivo(usuario.id, { ...o, completado, avance: completado ? o.meta : o.avance });
  rev();
  return { ok: true };
}

export async function abonarObjetivo(id: string, monto: number): Promise<R> {
  const { usuario, repo } = await contexto();
  const o = (await repo.objetivos(usuario.id)).find((x) => x.id === id);
  if (!o) return { ok: false, error: 'No encontramos el objetivo.' };
  const avance = Math.max(0, o.avance + Math.round(monto));
  await repo.guardarObjetivo(usuario.id, { ...o, avance, completado: avance >= o.meta });
  rev();
  return { ok: true };
}

export async function eliminarObjetivo(id: string): Promise<R> {
  const { usuario, repo } = await contexto();
  await repo.eliminarObjetivo(usuario.id, id);
  rev();
  return { ok: true };
}
