'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { contexto } from '@/lib/data/contexto';
import { asegurarCliente, crearCheckout, crearPortal, stripeConfigurado } from '@/lib/services/stripe';
import { registrar } from '@/lib/services/analytics';

function origen() {
  return process.env.NEXT_PUBLIC_APP_URL || `https://${headers().get('host')}`;
}

export async function iniciarCheckout(intervalo: 'mes' | 'anio'): Promise<{ ok: false; error: string } | never> {
  if (!stripeConfigurado()) return { ok: false, error: 'El cobro aún no está activado. Tu prueba sigue activa.' };
  const { usuario, repo, perfil } = await contexto();
  const customerId = await asegurarCliente(usuario.id, usuario.email, perfil.stripeCustomerId);
  if (customerId !== perfil.stripeCustomerId) await repo.guardarPerfil(usuario.id, { stripeCustomerId: customerId });
  await registrar(repo, usuario.id, 'checkout_iniciado', { intervalo });
  const url = await crearCheckout({ customerId, userId: usuario.id, intervalo, trialUsado: !!perfil.stripeSubscriptionId || perfil.plan === 'vencido', origen: origen() });
  redirect(url);
}

export async function abrirPortal(): Promise<{ ok: false; error: string } | never> {
  if (!stripeConfigurado()) return { ok: false, error: 'El cobro aún no está activado.' };
  const { perfil } = await contexto();
  if (!perfil.stripeCustomerId) return { ok: false, error: 'Aún no tienes una suscripción.' };
  redirect(await crearPortal(perfil.stripeCustomerId, origen()));
}
