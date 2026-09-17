import { contexto } from '@/lib/data/contexto';
import { Planes } from '@/components/planes/Planes';
import { stripeConfigurado } from '@/lib/services/stripe';

export const metadata = { title: 'Planes · MoneyMaker' };
export const dynamic = 'force-dynamic';

export default async function PlanesPage({ searchParams }: { searchParams: { pago?: string } }) {
  const { perfil } = await contexto();
  return <Planes plan={perfil.plan} trialTermina={perfil.trialTermina} planRenueva={perfil.planRenueva ?? null} planIntervalo={perfil.planIntervalo ?? null} tieneSuscripcion={!!perfil.stripeSubscriptionId} cobroActivo={stripeConfigurado()} pago={searchParams.pago} />;
}
