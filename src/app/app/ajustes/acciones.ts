'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { contexto } from '@/lib/data/contexto';
import { MODO_MOCK } from '@/lib/supabase/env';
import { supabaseAdmin, supabaseServer } from '@/lib/supabase/server';
import { reiniciarMemoria } from '@/lib/data/repo.memoria';
import { getAggregator } from '@/lib/services/aggregator';
import { recalcular } from '@/lib/services/ingest';
import { registrar } from '@/lib/services/analytics';

type R = { ok: true } | { ok: false; error: string };

export async function actualizarPerfil(datos: { nombre?: string; diasPago?: number[]; ingresoQuincenal?: number | null; metas?: string[]; onboardingCompleto?: boolean }): Promise<R> {
  const { usuario, repo } = await contexto();
  const cambios: typeof datos = { ...datos };
  if (cambios.diasPago) {
    cambios.diasPago = Array.from(new Set(cambios.diasPago.map((d) => Math.max(1, Math.min(31, Math.round(d)))))).sort((a, b) => a - b);
    if (!cambios.diasPago.length) return { ok: false, error: 'Elige al menos un día de pago.' };
  }
  if (cambios.nombre !== undefined && !cambios.nombre.trim()) return { ok: false, error: 'Escribe tu nombre.' };
  await repo.guardarPerfil(usuario.id, cambios);
  if (cambios.onboardingCompleto) await registrar(repo, usuario.id, 'onboarding_completo', { metas: cambios.metas ?? [] });
  if (cambios.diasPago || cambios.ingresoQuincenal !== undefined) await recalcular(repo, usuario.id);
  for (const p of ['/app', '/app/ajustes', '/app/presupuesto', '/app/insights', '/onboarding']) revalidatePath(p);
  return { ok: true };
}

export async function eliminarFuente(linkId: string): Promise<R> {
  const { usuario, repo } = await contexto();
  const link = (await repo.links(usuario.id)).find((l) => l.id === linkId);
  if (!link) return { ok: false, error: 'No encontramos esa conexión.' };
  if (link.proveedor === 'belvo' && link.externalId) await getAggregator().eliminarLink(link.externalId).catch(() => {});
  await repo.eliminarLink(usuario.id, linkId);
  await recalcular(repo, usuario.id);
  for (const p of ['/app', '/app/ajustes', '/app/gastos', '/app/fijos', '/app/presupuesto']) revalidatePath(p);
  return { ok: true };
}

/** Derecho al olvido: borra links en el proveedor, todos los datos y la cuenta de auth. */
export async function borrarCuenta(): Promise<never> {
  const { usuario, repo } = await contexto();
  for (const l of await repo.links(usuario.id)) if (l.proveedor === 'belvo' && l.externalId) await getAggregator().eliminarLink(l.externalId).catch(() => {});
  await registrar(repo, usuario.id, 'cuenta_borrada');
  if (MODO_MOCK) {
    reiniciarMemoria(usuario.id);
    redirect('/app');
  }
  const admin = supabaseAdmin();
  await admin.auth.admin.deleteUser(usuario.id); // cascada en todas las tablas por FK
  await supabaseServer().auth.signOut();
  redirect('/registro');
}
