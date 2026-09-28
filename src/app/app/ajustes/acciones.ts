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
import { enviarBienvenida } from '@/lib/services/correosAuto';
import { correoConfigurado } from '@/lib/services/correo';
import { enSegundoPlano } from '@/lib/server/segundo-plano';

type R = { ok: true } | { ok: false; error: string };

export async function actualizarPerfil(datos: { nombre?: string; diasPago?: number[]; ingresoQuincenal?: number | null; metas?: string[]; onboardingCompleto?: boolean }): Promise<R> {
  const { usuario, repo, perfil } = await contexto();
  const cambios: typeof datos = { ...datos };
  const primeraVez = !!cambios.onboardingCompleto && !perfil.onboardingCompleto;
  if (cambios.diasPago) {
    cambios.diasPago = Array.from(new Set(cambios.diasPago.map((d) => Math.max(1, Math.min(31, Math.round(d)))))).sort((a, b) => a - b);
    if (!cambios.diasPago.length) return { ok: false, error: 'Elige al menos un día de pago.' };
  }
  if (cambios.nombre !== undefined && !cambios.nombre.trim()) return { ok: false, error: 'Escribe tu nombre.' };
  await repo.guardarPerfil(usuario.id, cambios);
  if (cambios.onboardingCompleto) await registrar(repo, usuario.id, 'onboarding_completo', { metas: cambios.metas ?? [] });
  if (primeraVez && correoConfigurado()) {
    const urlApp = process.env.NEXT_PUBLIC_APP_URL || 'https://money-maker-tawny.vercel.app';
    enSegundoPlano(
      enviarBienvenida({ email: usuario.email, nombre: cambios.nombre ?? perfil.nombre ?? null }, urlApp).then(async (r) => {
        if (r.ok) await registrar(repo, usuario.id, 'correo_bienvenida');
      }),
    );
  }
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

/** Avisos: resumen del domingo por correo y push de cobros próximos. Se guardan en el perfil. */
export async function guardarAvisos(datos: { resumenDomingo?: boolean; avisosCobros?: boolean }): Promise<R> {
  const { usuario, repo } = await contexto();
  const cambios: { resumenDomingo?: boolean; avisosCobros?: boolean } = {};
  if (typeof datos.resumenDomingo === 'boolean') cambios.resumenDomingo = datos.resumenDomingo;
  if (typeof datos.avisosCobros === 'boolean') cambios.avisosCobros = datos.avisosCobros;
  await repo.guardarPerfil(usuario.id, cambios);
  revalidatePath('/app/ajustes');
  return { ok: true };
}
