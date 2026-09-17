import { contexto } from '@/lib/data/contexto';
import { Insights } from '@/components/insights/Insights';

export const metadata = { title: 'Insights · MoneyMaker' };
export const dynamic = 'force-dynamic';

export default async function InsightsPage() {
  const { usuario, repo } = await contexto();
  const insights = await repo.insights(usuario.id);
  return <Insights insights={insights} />;
}
