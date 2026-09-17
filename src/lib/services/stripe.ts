// Cobro con Stripe: suscripción Premium mensual/anual con 7 días de prueba (tarjeta requerida).
// El estado del plan vive en profiles y lo actualiza el webhook; la app nunca confía en el cliente.

import Stripe from 'stripe';

export function stripeConfigurado() {
  return !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_MENSUAL && process.env.STRIPE_PRICE_ANUAL);
}

let cliente: Stripe | null = null;
export function stripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('Falta STRIPE_SECRET_KEY');
  return (cliente ??= new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' }));
}

export function precioDe(intervalo: 'mes' | 'anio') {
  return intervalo === 'anio' ? process.env.STRIPE_PRICE_ANUAL! : process.env.STRIPE_PRICE_MENSUAL!;
}

export async function asegurarCliente(userId: string, email: string, customerId?: string | null): Promise<string> {
  if (customerId) return customerId;
  const c = await stripe().customers.create({ email, metadata: { userId } });
  return c.id;
}

/** Sesión de Checkout con prueba de 7 días. `trialUsado` evita regalar una segunda prueba. */
export async function crearCheckout(args: { customerId: string; userId: string; intervalo: 'mes' | 'anio'; trialUsado: boolean; origen: string }) {
  const s = await stripe().checkout.sessions.create({
    mode: 'subscription',
    customer: args.customerId,
    line_items: [{ price: precioDe(args.intervalo), quantity: 1 }],
    subscription_data: { metadata: { userId: args.userId }, ...(args.trialUsado ? {} : { trial_period_days: 7 }) },
    payment_method_collection: 'always',
    allow_promotion_codes: true,
    locale: 'es',
    success_url: `${args.origen}/app/planes?pago=ok`,
    cancel_url: `${args.origen}/app/planes?pago=cancelado`,
    metadata: { userId: args.userId },
  });
  return s.url!;
}

export async function crearPortal(customerId: string, origen: string) {
  const p = await stripe().billingPortal.sessions.create({ customer: customerId, return_url: `${origen}/app/planes`, locale: 'es' });
  return p.url;
}

/** Traduce una suscripción de Stripe al estado del perfil. */
export function estadoDesdeSuscripcion(sub: Stripe.Subscription): { plan: 'trial' | 'premium' | 'vencido'; planRenueva: string | null; planIntervalo: 'mes' | 'anio' | null; stripeSubscriptionId: string | null } {
  const intervalo = sub.items.data[0]?.price.recurring?.interval === 'year' ? 'anio' : 'mes';
  const renueva = new Date(sub.current_period_end * 1000).toISOString();
  if (sub.status === 'trialing') return { plan: 'trial', planRenueva: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : renueva, planIntervalo: intervalo, stripeSubscriptionId: sub.id };
  if (sub.status === 'active' || sub.status === 'past_due') return { plan: 'premium', planRenueva: renueva, planIntervalo: intervalo, stripeSubscriptionId: sub.id };
  return { plan: 'vencido', planRenueva: null, planIntervalo: intervalo, stripeSubscriptionId: sub.status === 'canceled' ? null : sub.id };
}
