'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Search } from 'lucide-react';
import { tabActual } from '@/lib/nav';
import { useSaludo } from './Saludo';
import { Buscador, useAtajoBuscar } from './Buscador';

export function MobileHeader({ iniciales, nombre }: { iniciales: string; nombre?: string }) {
  const pathname = usePathname();
  const tab = tabActual(pathname);
  const saludo = useSaludo(nombre ?? '');
  const titulo = tab.href === '/app' && nombre ? saludo : tab.titulo;
  const [buscar, setBuscar] = useAtajoBuscar();
  return (
    <>
    <header className="flex items-center gap-2 px-3.5 pb-1 pt-[max(12px,env(safe-area-inset-top))] md:hidden">
      <h1 className="min-w-0 flex-1 truncate font-display text-[17px] font-bold tracking-[-0.3px]">{titulo}</h1>
      <button type="button" onClick={() => setBuscar(true)} aria-label="Buscar" className="flex h-9 w-9 items-center justify-center rounded-full text-fg">
        <Search size={19} />
      </button>
      <Link href="/app/insights" aria-label="Insights" className="flex h-9 w-9 items-center justify-center rounded-full text-fg">
        <Bell size={19} />
      </Link>
      <Link href="/app/ajustes" aria-label="Ajustes" className="flex h-9 w-9 items-center justify-center rounded-full bg-ink font-display text-[12px] font-bold text-white dark:bg-white dark:text-ink">
        {iniciales}
      </Link>
    </header>
    <Buscador open={buscar} onClose={() => setBuscar(false)} />
    </>
  );
}
