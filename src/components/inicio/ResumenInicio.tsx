'use client';

import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { money } from '@/lib/format';
import { Money } from '@/components/ui/Money';
import type { CuentaVista } from './tipos';

/** Arriba de Inicio: saldo neto (lo que tienes menos lo que debes) en tarjeta oscura, y dos tiles: cuentas y tarjetas. */
export function ResumenInicio({ cuentas }: { cuentas: CuentaVista[] }) {
  const activas = cuentas.filter((c) => c.activo !== false);
  const enCuentas = activas.filter((c) => c.tipo !== 'credito').reduce((s, c) => s + Math.max(0, c.saldo), 0);
  const enTarjetas = activas.filter((c) => c.tipo === 'credito').reduce((s, c) => s + Math.max(0, c.saldo), 0);
  const neto = enCuentas - enTarjetas;
  const nCuentas = activas.filter((c) => c.tipo !== 'credito').length;
  const nTarjetas = activas.filter((c) => c.tipo === 'credito').length;

  return (
    <section className="space-y-3">
      <div className="rounded-card-xl bg-ink p-5 text-white shadow-dark dark:bg-surface-2 dark:ring-1 dark:ring-white/10">
        <div className="text-[12.5px] font-semibold text-white/70">Saldo neto</div>
        <Money value={neto} animate className="mt-1 block text-[38px] font-bold leading-none tracking-[-1.6px] text-white" />
        <div className="mt-2 text-[12px] text-white/60">Lo que tienes en cuentas menos lo que debes en tarjetas.</div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-50 text-green-dark dark:bg-surface-2 dark:text-green-light"><ArrowDownLeft size={16} /></span>
          <div className="mt-3 text-[12px] font-semibold text-txt-2 dark:text-fg-2">Cuentas</div>
          <Money value={enCuentas} tone="ink" className="block text-[22px] font-bold leading-tight tracking-[-0.6px]" />
          <div className="text-[11px] text-txt-3">{nCuentas === 1 ? '1 cuenta' : `${nCuentas} cuentas`}</div>
        </div>
        <div className="card p-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-negative-50 text-negative dark:bg-surface-2"><ArrowUpRight size={16} /></span>
          <div className="mt-3 text-[12px] font-semibold text-txt-2 dark:text-fg-2">Tarjetas</div>
          <Money value={enTarjetas} tone="blue" className="block text-[22px] font-bold leading-tight tracking-[-0.6px]" />
          <div className="text-[11px] text-txt-3">{nTarjetas === 1 ? '1 tarjeta' : `${nTarjetas} tarjetas`}{enTarjetas > 0 ? ` · ${money(enTarjetas)} por pagar` : ''}</div>
        </div>
      </div>
    </section>
  );
}
