import { contexto } from '@/lib/data/contexto';
import { getAggregator } from '@/lib/services/aggregator';
import { MODO_MOCK } from '@/lib/supabase/env';
import { supabaseServer } from '@/lib/supabase/server';
import { Onboarding } from '@/components/onboarding/Onboarding';

export const metadata = { title: 'Bienvenido · MoneyMaker' };
export const dynamic = 'force-dynamic';

/** ¿Entró con contraseña (o Google)? Entonces no se la pedimos. Con enlace de correo no tiene una. */
async function tieneContraseña(): Promise<boolean> {
  if (MODO_MOCK) return false;
  const { data } = await supabaseServer().auth.getUser();
  const proveedores = (data.user?.app_metadata?.providers as string[] | undefined) ?? [];
  return proveedores.includes('google') || !!data.user?.user_metadata?.con_contraseña;
}

export default async function OnboardingPage({ searchParams }: { searchParams: { paso?: string } }) {
  const { usuario, perfil } = await contexto();
  const agg = getAggregator();
  const [instituciones, conContraseña] = await Promise.all([agg.listarInstituciones().catch(() => []), tieneContraseña()]);
  const paso = Math.min(2, Math.max(0, Number(searchParams.paso ?? 0) || 0));
  // Solo saludamos por nombre si lo tenemos de verdad; el usuario del correo ("jcostosn") no es un nombre.
  const derivadoDelCorreo = usuario.nombre === (usuario.email ?? '').split('@')[0] || usuario.nombre === 'Tú';
  const nombre = perfil.nombre?.trim() || (!derivadoDelCorreo ? usuario.nombre : null) || null;
  return <Onboarding nombre={nombre} perfil={{ metas: perfil.metas }} pasoInicial={paso} tieneContraseña={conContraseña} instituciones={instituciones} agregador={agg.nombre} sandbox={agg.entorno === 'sandbox'} />;
}
