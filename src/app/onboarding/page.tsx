import { contexto } from '@/lib/data/contexto';
import { Onboarding } from '@/components/onboarding/Onboarding';

export const metadata = { title: 'Bienvenido · MoneyMaker' };
export const dynamic = 'force-dynamic';

export default async function OnboardingPage({ searchParams }: { searchParams: { paso?: string } }) {
  const { usuario, perfil } = await contexto();
  const paso = Math.min(3, Math.max(0, Number(searchParams.paso ?? 0) || 0));
  // Solo saludamos por nombre si lo tenemos de verdad; el usuario del correo ("jcostosn") no es un nombre.
  const derivadoDelCorreo = usuario.nombre === (usuario.email ?? '').split('@')[0] || usuario.nombre === 'Tú';
  const nombre = perfil.nombre?.trim() || (!derivadoDelCorreo ? usuario.nombre : null) || null;
  return <Onboarding nombre={nombre} perfil={{ metas: perfil.metas, diasPago: perfil.diasPago, ingresoQuincenal: perfil.ingresoQuincenal ?? null }} pasoInicial={paso} />;
}
