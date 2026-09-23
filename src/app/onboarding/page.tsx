import { contexto } from '@/lib/data/contexto';
import { Onboarding } from '@/components/onboarding/Onboarding';

export const metadata = { title: 'Bienvenido · MoneyMaker' };
export const dynamic = 'force-dynamic';

export default async function OnboardingPage({ searchParams }: { searchParams: { paso?: string } }) {
  const { usuario, perfil } = await contexto();
  const paso = Math.min(3, Math.max(0, Number(searchParams.paso ?? 0) || 0));
  return <Onboarding nombre={usuario.nombreCorto} perfil={{ metas: perfil.metas, diasPago: perfil.diasPago, ingresoQuincenal: perfil.ingresoQuincenal ?? null }} pasoInicial={paso} />;
}
