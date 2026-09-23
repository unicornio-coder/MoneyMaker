import { redirect } from 'next/navigation';
import { AppShell } from '@/components/shell/AppShell';
import { contexto } from '@/lib/data/contexto';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { usuario, perfil, repo } = await contexto();
  if (!perfil.onboardingCompleto) redirect('/onboarding');
  const [links, pendientes] = await Promise.all([repo.links(usuario.id), repo.importaciones(usuario.id, { estados: ['procesando', 'revisar'] }).catch(() => [])]);
  const hayFuentes = links.some((l) => (l.proveedor === 'belvo' || l.proveedor === 'gmail' || l.proveedor === 'bitso') && l.estado !== 'roto');
  // Solo cuentan como "en proceso" las lecturas recientes: una que quedó colgada hace horas no debe mostrar el aviso.
  const hace10min = Date.now() - 10 * 60_000;
  const importaciones = { procesando: pendientes.filter((i) => i.estado === 'procesando' && new Date(i.updatedAt).getTime() > hace10min).length, revisar: pendientes.filter((i) => i.estado === 'revisar').length };
  return <AppShell usuario={{ nombre: usuario.nombreCorto, iniciales: usuario.iniciales }} hayFuentes={hayFuentes} importaciones={importaciones}>{children}</AppShell>;
}
