import Link from 'next/link';
import { PiggyBank, CreditCard, TrendingUp, Check } from 'lucide-react';
import { cn } from '@/lib/cn';
import { money, fechaCorta } from '@/lib/format';
import type { Objetivo } from '@/lib/domain/tipos';

const GRUPOS: { id: Objetivo['grupo']; label: string; icon: typeof PiggyBank; bg: string }[] = [
  { id: 'ahorro', label: 'Ahorro', icon: PiggyBank, bg: 'bg-green-50 text-green-dark dark:text-green-light' },
  { id: 'deuda', label: 'Deuda', icon: CreditCard, bg: 'bg-negative-50 text-negative' },
  { id: 'inversion', label: 'Inversión', icon: TrendingUp, bg: 'bg-invest-soft text-invest' },
];

export function ObjetivosBloque({ objetivos, compacto = true }: { objetivos: Objetivo[]; compacto?: boolean }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-[18px] font-bold">Objetivos</h2>
        <Link href="/app/objetivos" className="text-[12px] font-semibold text-green-dark dark:text-green-light">Ver todos</Link>
      </div>
      {GRUPOS.map((g) => {
        const lista = objetivos.filter((o) => o.grupo === g.id).slice(0, compacto ? 2 : undefined);
        if (!lista.length) return null;
        const Icon = g.icon;
        return (
          <div key={g.id}>
            <div className="mb-2 flex items-center gap-2 text-[12.5px] font-bold">
              <span className={cn('flex h-[26px] w-[26px] items-center justify-center rounded-[8px]', g.bg)}><Icon size={15} /></span>
              {g.label}
            </div>
            <ul className="overflow-hidden rounded-16 bg-ink text-white">
              {lista.map((o) => {
                const p = Math.min(100, (o.avance / o.meta) * 100);
                return (
                  <li key={o.id} className="flex items-center gap-3 border-b border-white/10 px-3.5 py-3 last:border-b-0">
                    <span className={cn('flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full border-2', o.completado ? 'border-green-light bg-green-light text-ink' : 'border-white/30')}>
                      {o.completado && <Check size={14} strokeWidth={3} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-[13.5px] font-bold">{o.nombre}</span>
                        <span className="flex-none text-[11px] text-white/60">{o.fecha ? fechaCorta(o.fecha) : ''}</span>
                      </div>
                      <div className="mt-1.5 h-1 w-full rounded-pill bg-white/12">
                        <div className="h-1 rounded-pill bg-green-light transition-[width] duration-[550ms] ease-bounce" style={{ width: `${p}%` }} />
                      </div>
                      <div className="mt-1 text-[11px] text-white/70">{money(o.avance)} / {money(o.meta)}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
