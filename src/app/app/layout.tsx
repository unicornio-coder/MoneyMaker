import { AppShell } from '@/components/shell/AppShell';
import { usuarioActual } from '@/lib/auth/session';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const usuario = await usuarioActual();
  return <AppShell usuario={{ nombre: usuario.nombreCorto, iniciales: usuario.iniciales }}>{children}</AppShell>;
}
