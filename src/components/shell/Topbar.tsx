'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Search, Moon, Sun, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/cn';
import { tabActual } from '@/lib/nav';
import { useUI, type Periodo } from '@/lib/store/ui';
import { ChipGroup } from '@/components/ui/Chip';
import { useSaludo } from './Saludo';

const PERIODOS: { value: Periodo; label: string }[] = [
  { value: 'q', label: 'Quincena' },
  { value: 'mes', label: 'Mes' },
  { value: 'anio', label: 'Año' },
];

const CON_PERIODO = new Set(['/app', '/app/gastos', '/app/fijos', '/app/presupuesto']);

export function Topbar({ iniciales, nombre }: { iniciales: string; nombre?: string }) {
  const pathname = usePathname();
  const tab = tabActual(pathname);
  const periodo = useUI((s) => s.periodo);
  const setPeriodo = useUI((s) => s.setPeriodo);
  const tema = useUI((s) => s.tema);
  const toggleTema = useUI((s) => s.toggleTema);
  const ocultar = useUI((s) => s.ocultarSaldos);
  const toggleOcultar = useUI((s) => s.toggleOcultarSaldos);
  const saludo = useSaludo(nombre ?? '');
  const titulo = tab.href === '/app' && nombre ? saludo : tab.titulo;

  const IconBtn = ({ children, onClick, href, label }: { children: React.ReactNode; onClick?: () => void; href?: string; label: string }) => {
    const cls = 'flex h-9 w-9 items-center justify-center rounded-full text-fg transition-colors hover:bg-bg-page dark:hover:bg-surface-2';
    return href ? (
      <Link href={href} aria-label={label} className={cls}>{children}</Link>
    ) : (
      <button type="button" onClick={onClick} aria-label={label} className={cls}>{children}</button>
    );
  };

  return (
    <header className="sticky top-0 z-30 flex h-[54px] items-center gap-3 border-b border-edge bg-surface/95 px-4 backdrop-blur md:px-6">
      <h1 className="min-w-0 flex-1 truncate font-display text-[18.9px] font-bold tracking-[-0.4px] md:flex-none">{titulo}</h1>
      <div className="hidden flex-1 justify-center md:flex">
        {CON_PERIODO.has(tab.href) && <ChipGroup value={periodo} onChange={setPeriodo} options={PERIODOS} size="sm" />}
      </div>
      <div className="flex items-center gap-1">
        <label className="relative hidden items-center lg:flex">
          <Search size={15} className="pointer-events-none absolute left-3 text-txt-3" />
          <input placeholder="Buscar" className="h-9 w-[180px] rounded-pill border border-line-2 bg-bg-page pl-9 pr-3 text-[12.5px] outline-none focus:border-green dark:border-edge dark:bg-surface-2" />
        </label>
        <IconBtn onClick={toggleOcultar} label={ocultar ? 'Mostrar saldos' : 'Ocultar saldos'}>{ocultar ? <EyeOff size={18} /> : <Eye size={18} />}</IconBtn>
        <IconBtn onClick={toggleTema} label="Cambiar tema">{tema === 'oscuro' ? <Sun size={18} /> : <Moon size={18} />}</IconBtn>
        <IconBtn href="/app/insights" label="Insights"><Bell size={18} className={cn(tab.href === '/app/insights' && 'text-green')} /></IconBtn>
        <Link href="/app/ajustes" aria-label="Ajustes" className="ml-1 flex h-9 w-9 items-center justify-center rounded-full bg-ink font-display text-[12px] font-bold text-white dark:bg-white dark:text-ink">
          {iniciales}
        </Link>
      </div>
    </header>
  );
}
