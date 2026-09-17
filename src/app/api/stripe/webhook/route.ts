import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { stripe, estadoDesdeSuscripcion } from '@/lib/services/stripe';
import { supabaseAdmin } from '@/lib/supabase/server';
import { repoSupabaseCon } from '@/lib/data/repo.supabase';
import { registrar } from '@/lib/services/analytics';

export const runtime = 'nodejs';

/** Webhook de Stripe: mantiene profiles.plan sincronizado con la suscripción. Firma verificada con STRIPE_WEBHOOK_SECRET. */
export async function POST(req: Request) {
  const firma = req.headers.get('stripe-signature');
  const secreto = process.env.STRIPE_WEBHOOK_SECRET;
  if (!firma || !secreto) return NextResponse.json({ error: 'sin firma' }, { status: 400 });
  let evento: Stripe.Event;
  try {
    evento = stripe().webhooks.constructEvent(await req.text(), firma, secreto);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'firma inválida' }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const repo = repoSupabaseCon(() => admin);

  async function aplicar(sub: Stripe.Subscription) {
    const userId = sub.metadata?.userId;
    const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
    let id: string | undefined = userId;
    if (!id) {
      const { data } = await admin.from('profiles').select('id').eq('stripe_customer_id', customerId).maybeSingle();
      id = data?.id ? String(data.id) : undefined;
    }
    if (!id) return;
    const uid: string = id;
    const estado = estadoDesdeSuscripcion(sub);
    await repo.guardarPerfil(uid, { ...estado, stripeCustomerId: customerId });
    if (estado.plan === 'premium' && evento.type === 'invoice.paid') await registrar(repo, uid, 'suscripcion_pagada', { intervalo: estado.planIntervalo });
  }

  switch (evento.type) {
    case 'checkout.session.completed': {
      const s = evento.data.object as Stripe.Checkout.Session;
      if (s.subscription) await aplicar(await stripe().subscriptions.retrieve(String(s.subscription)));
      break;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      await aplicar(evento.data.object as Stripe.Subscription);
      break;
    case 'invoice.paid':
    case 'invoice.payment_failed': {
      const inv = evento.data.object as Stripe.Invoice;
      if (inv.subscription) await aplicar(await stripe().subscriptions.retrieve(String(inv.subscription)));
      break;
    }
  }
  return NextResponse.json({ received: true });
}
