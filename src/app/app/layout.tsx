import { redirect } from 'next/navigation';
import { AppShell } from '@/components/shell/AppShell';
import { contexto } from '@/lib/data/contexto';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { usuario, perfil, repo } = await contexto();
  if (!perfil.onboardingCompleto) redirect('/onboarding');
  const links = await repo.links(usuario.id);
  const hayFuentes = links.some((l) => (l.proveedor === 'belvo' || l.proveedor === 'gmail' || l.proveedor === 'bitso') && l.estado !== 'roto');
  return <AppShell usuario={{ nombre: usuario.nombreCorto, iniciales: usuario.iniciales }} hayFuentes={hayFuentes}>{children}</AppShell>;
}
