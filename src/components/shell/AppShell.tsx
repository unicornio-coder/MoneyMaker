import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { TabBar } from './TabBar';
import { MobileHeader } from './MobileHeader';
import { SyncAlAbrir } from './SyncAlAbrir';

type Props = {
  children: React.ReactNode;
  usuario: { nombre: string; iniciales: string };
  hayFuentes?: boolean;
};

/** Un solo árbol para web y móvil: la sidebar/topbar aparecen desde md, la tab bar por debajo. */
export function AppShell({ children, usuario, hayFuentes = false }: Props) {
  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="hidden md:block">
          <Topbar iniciales={usuario.iniciales} nombre={usuario.nombre} />
        </div>
        <MobileHeader iniciales={usuario.iniciales} nombre={usuario.nombre} />
        <main className="mx-auto w-full max-w-main flex-1 px-3.5 pb-[120px] pt-2 md:px-6 md:pb-16 md:pt-[22px]">
          <div className="animate-screen">{children}</div>
        </main>
      </div>
      <TabBar />
      <SyncAlAbrir hayFuentes={hayFuentes} />
    </div>
  );
}
