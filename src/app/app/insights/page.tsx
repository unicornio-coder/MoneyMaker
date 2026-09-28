import { contexto } from '@/lib/data/contexto';
import { Insights } from '@/components/insights/Insights';

export const metadata = { title: 'Avisos · MoneyMaker' };
export const dynamic = 'force-dynamic';

export default async function InsightsPage() {
  const { usuario, repo } = await contexto();
  const [insights, objetivos] = await Promise.all([repo.insights(usuario.id), repo.objetivos(usuario.id)]);
  return <Insights insights={insights} objetivos={objetivos} />;
}
