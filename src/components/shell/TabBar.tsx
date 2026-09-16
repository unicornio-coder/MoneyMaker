'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/cn';
import { TABBAR_IZQ, TABBAR_DER, MAS_ITEMS, tabActual } from '@/lib/nav';
import { useUI } from '@/lib/store/ui';
import { Panel } from '@/components/ui/Panel';

export function TabBar() {
  const pathname = usePathname();
  const actual = tabActual(pathname);
  const masAbierto = useUI((s) => s.masAbierto);
  const setMasAbierto = useUI((s) => s.setMasAbierto);

  const Item = ({ tab }: { tab: (typeof TABBAR_IZQ)[number] }) => {
    const activo = actual.href === tab.href;
    const Icon = tab.icon;
    return (
      <Link href={tab.href} className={cn('flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors', activo ? 'text-green-light' : 'text-white/55')}>
        <Icon size={22} strokeWidth={2} />
        <span>{tab.tabbar}</span>
      </Link>
    );
  };

  return (
    <>
      <nav className="fixed inset-x-3.5 bottom-[max(14px,env(safe-area-inset-bottom))] z-40 flex h-[66px] items-center rounded-pill bg-ink px-2 shadow-tabbar md:hidden">
        {TABBAR_IZQ.map((t) => <Item key={t.href} tab={t} />)}
        <button
          type="button"
          onClick={() => setMasAbierto(true)}
          aria-label="Más"
          className="mx-1 flex h-[52px] w-[52px] flex-none items-center justify-center rounded-full bg-green-light text-ink shadow-plus transition-transform active:scale-95"
        >
          <Plus size={26} strokeWidth={2.5} />
        </button>
        {TABBAR_DER.map((t) => <Item key={t.href} tab={t} />)}
      </nav>

      <Panel open={masAbierto} onClose={() => setMasAbierto(false)} mode="sheet">
        <ul className="pb-2 pt-3">
          {MAS_ITEMS.map((t) => {
            const Icon = t.icon;
            return (
              <li key={t.href}>
                <Link
                  href={t.href}
                  onClick={() => setMasAbierto(false)}
                  className="flex h-[60px] items-center gap-3.5 border-b border-edge text-[14px] font-semibold last:border-b-0"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-bg-muted dark:bg-surface-2">
                    <Icon size={19} />
                  </span>
                  {t.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </Panel>
    </>
  );
}
