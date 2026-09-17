import { contexto } from '@/lib/data/contexto';
import { getAggregator } from '@/lib/services/aggregator';
import { Onboarding } from '@/components/onboarding/Onboarding';

export const metadata = { title: 'Bienvenido · MoneyMaker' };
export const dynamic = 'force-dynamic';

export default async function OnboardingPage({ searchParams }: { searchParams: { paso?: string } }) {
  const { usuario, perfil } = await contexto();
  const agg = getAggregator();
  const instituciones = await agg.listarInstituciones().catch(() => []);
  const paso = Math.min(4, Math.max(0, Number(searchParams.paso ?? 0) || 0));
  return <Onboarding nombre={usuario.nombreCorto} perfil={{ metas: perfil.metas, diasPago: perfil.diasPago, ingresoQuincenal: perfil.ingresoQuincenal ?? null }} instituciones={instituciones} agregador={agg.nombre} pasoInicial={paso} />;
}
