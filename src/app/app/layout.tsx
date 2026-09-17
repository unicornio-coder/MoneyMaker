import { redirect } from 'next/navigation';
import { AppShell } from '@/components/shell/AppShell';
import { contexto } from '@/lib/data/contexto';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { usuario, perfil } = await contexto();
  if (!perfil.onboardingCompleto) redirect('/onboarding');
  return <AppShell usuario={{ nombre: usuario.nombreCorto, iniciales: usuario.iniciales }}>{children}</AppShell>;
}
