'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { cn } from '@/lib/cn';
import { TABS, tabActual } from '@/lib/nav';
import { useUI } from '@/lib/store/ui';
import { Logo } from './Logo';

export function Sidebar() {
  const pathname = usePathname();
  const actual = tabActual(pathname);
  const expandida = useUI((s) => s.sidebarExpandida);
  const toggle = useUI((s) => s.toggleSidebar);

  const grupo1 = TABS.filter((t) => t.grupo === 1);
  const grupo2 = TABS.filter((t) => t.grupo === 2);
  const abajo = TABS.filter((t) => t.grupo === 'abajo');

  const Item = ({ tab }: { tab: (typeof TABS)[number] }) => {
    const activo = actual.href === tab.href;
    const Icon = tab.icon;
    return (
      <Link
        href={tab.href}
        title={tab.label}
        className={cn(
          'flex h-10 items-center gap-2.5 rounded-[11px] px-3 text-[12.5px] font-semibold transition-colors duration-[160ms]',
          activo ? 'bg-green-50 text-green-dark dark:bg-surface-2 dark:text-green-light' : 'text-txt-2 hover:bg-bg-page dark:text-fg-2 dark:hover:bg-surface-2',
          !expandida && 'justify-center px-0',
        )}
      >
        <Icon size={18} strokeWidth={2} className="flex-none" />
        {expandida && <span className="truncate">{tab.label}</span>}
      </Link>
    );
  };

  return (
    <aside
      aria-label="Menú principal"
      className={cn(
        'sticky top-0 hidden h-dvh flex-none flex-col border-r border-edge bg-surface transition-[width] duration-[250ms] ease-out md:flex',
        expandida ? 'w-[208px]' : 'w-[66px]',
      )}
    >
      <div className={cn('flex h-[54px] items-center gap-2.5 px-4', !expandida && 'justify-center px-0')}>
        <Logo />
        {expandida && (
          <div className="min-w-0">
            <div className="font-display text-[14.5px] font-bold leading-tight">MoneyMaker</div>
            <div className="text-[10.5px] text-txt-2 dark:text-fg-2">Tu quincena, clara</div>
          </div>
        )}
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-2.5 pt-2">
        {grupo1.map((t) => <Item key={t.href} tab={t} />)}
        <div className="my-2 h-px bg-edge" />
        {grupo2.map((t) => <Item key={t.href} tab={t} />)}
        <div className="flex-1" />
        {abajo.map((t) => <Item key={t.href} tab={t} />)}
        <button
          type="button"
          onClick={toggle}
          aria-label={expandida ? 'Contraer menú' : 'Expandir menú'}
          className={cn('mb-3 flex h-10 items-center gap-2.5 rounded-[11px] px-3 text-[12.5px] font-semibold text-txt-3 hover:bg-bg-page dark:hover:bg-surface-2', !expandida && 'justify-center px-0')}
        >
          {expandida ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
          {expandida && <span>Contraer</span>}
        </button>
      </nav>
    </aside>
  );
}
