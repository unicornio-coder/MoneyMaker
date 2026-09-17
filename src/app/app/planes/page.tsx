import { contexto } from '@/lib/data/contexto';
import { Planes } from '@/components/planes/Planes';

export const metadata = { title: 'Planes · MoneyMaker' };
export const dynamic = 'force-dynamic';

export default async function PlanesPage() {
  const { perfil } = await contexto();
  return <Planes plan={perfil.plan} trialTermina={perfil.trialTermina} />;
}
