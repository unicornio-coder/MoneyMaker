import { contexto } from '@/lib/data/contexto';
import { Planes } from '@/components/planes/Planes';
import { stripeConfigurado } from '@/lib/services/stripe';
import { redirect } from 'next/navigation';
import { nivelPlan } from '@/lib/domain/plan';
import { PLANES } from '@/lib/flags';

export const metadata = { title: 'Planes · MoneyMaker' };
export const dynamic = 'force-dynamic';

export default async function PlanesPage({ searchParams }: { searchParams: { pago?: string } }) {
  if (!PLANES) redirect('/app/ajustes');
  const { perfil } = await contexto();
  return <Planes plan={perfil.plan} nivel={nivelPlan(perfil)} trialTermina={perfil.trialTermina} planRenueva={perfil.planRenueva ?? null} planIntervalo={perfil.planIntervalo ?? null} tieneSuscripcion={!!perfil.stripeSubscriptionId} cobroActivo={stripeConfigurado()} pago={searchParams.pago} />;
}
