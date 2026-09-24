'use client';

import Link from 'next/link';
import { CalendarClock, ChevronRight } from 'lucide-react';
import { money, fechaCorta } from '@/lib/format';
import { deISO } from '@/lib/domain/fechas';
import { cobrosProximos } from '@/lib/domain/recurrentes';
import type { Recurrente } from '@/lib/domain/tipos';
import { Money } from '@/components/ui/Money';
import { Avatar } from '@/components/ui/Avatar';
import type { CuentaVista } from './tipos';

/** Arriba de Inicio, como Rocket Money: saldo neto (lo que tienes menos lo que debes) y los cobros de los próximos 7 días. */
export function ResumenInicio({ cuentas, recurrentes, hoy }: { cuentas: CuentaVista[]; recurrentes: Recurrente[]; hoy: string }) {
  const activos = cuentas.filter((c) => c.activo !== false && c.tipo !== 'credito').reduce((s, c) => s + Math.max(0, c.saldo), 0);
  const deudas = cuentas.filter((c) => c.activo !== false && c.tipo === 'credito').reduce((s, c) => s + Math.max(0, c.saldo), 0);
  const neto = activos - deudas;
  const { lista, total } = cobrosProximos(recurrentes, deISO(hoy), 7);

  return (
    <section className="card p-[18px]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[12.9px] font-semibold text-txt-2 dark:text-fg-2">Saldo neto</div>
          <Money value={neto} animate className="mt-0.5 block text-[30px] font-bold leading-none tracking-[-1.2px]" tone={neto < 0 ? 'blue' : 'ink'} />
          <div className="mt-1.5 text-[12px] text-txt-2 dark:text-fg-2">
            <span className="font-semibold text-fg">{money(activos)}</span> en cuentas · <span className="font-semibold text-negative">{money(deudas)}</span> en tarjetas
          </div>
        </div>
        <Link href="/app/fijos?vista=cal" className="flex items-center gap-1.5 rounded-pill border border-line-2 px-3 py-1.5 text-[12px] font-semibold hover:bg-bg-hover dark:border-edge dark:hover:bg-surface-2">
          <CalendarClock size={14} /> Próximos 7 días · {money(total)} <ChevronRight size={14} className="text-txt-3" />
        </Link>
      </div>
      {lista.length > 0 && (
        <ul className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {lista.slice(0, 6).map((c) => (
            <li key={c.recurrente.id} className="flex flex-none items-center gap-2 rounded-card border border-edge px-2.5 py-2">
              <Avatar domain={c.recurrente.comercioDominio} nombre={c.recurrente.nombre} size={28} logoPct={60} />
              <span className="min-w-0">
                <span className="block max-w-[110px] truncate text-[12px] font-bold">{c.recurrente.nombre}</span>
                <span className="block text-[10.5px] text-txt-2 dark:text-fg-2">{fechaCorta(c.fecha)} · {money(c.monto)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
