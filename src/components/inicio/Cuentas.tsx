'use client';

import { CreditCard, Plus } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Money } from '@/components/ui/Money';
import { Avatar } from '@/components/ui/Avatar';
import type { CuentaVista } from './tipos';

export function Plastico({ cuenta, className, size = 'md' }: { cuenta: CuentaVista; className?: string; size?: 'md' | 'sm' }) {
  const color = cuenta.color || '#0B1F17';
  return (
    <div
      className={cn('relative overflow-hidden rounded-card text-white', size === 'md' ? 'aspect-[1.62] w-full' : 'h-[72px] w-[112px] rounded-[10px]', className)}
      style={{ background: `linear-gradient(135deg, ${color} 0%, ${color} 55%, rgba(255,255,255,0.28) 100%), ${color}`, boxShadow: '0 8px 20px rgba(11,31,23,0.18)' }}
    >
      <span className={cn('absolute flex items-center justify-center rounded-full bg-white', size === 'md' ? 'right-3.5 top-3.5 h-9 w-9' : 'right-2 top-2 h-6 w-6')}>
        <Avatar domain={cuenta.bancoDominio} nombre={cuenta.banco} size={size === 'md' ? 34 : 22} logoPct={66} bg="transparent" className="text-ink" />
      </span>
      <span className={cn('absolute font-display font-bold tracking-[0.5px] text-white/90', size === 'md' ? 'left-4 top-3.5 text-[13px]' : 'left-2.5 top-1.5 text-[8px]')}>{cuenta.banco}</span>
      <span className={cn('absolute rounded-[4px] bg-[#F5D77A]', size === 'md' ? 'left-4 top-12 h-5 w-7' : 'left-2.5 top-6 h-3 w-4')} />
      <span className={cn('absolute bottom-3.5 left-4 font-display font-extrabold tracking-[3px]', size === 'md' ? 'text-[15px]' : 'text-[9px] bottom-2 left-2.5')}>
        {cuenta.ultimos4 ? `•••• ${cuenta.ultimos4}` : cuenta.tipo === 'inversion' ? 'INVERSIÓN' : cuenta.tipo === 'efectivo' ? '$' : ''}
      </span>
    </div>
  );
}

export function Cuentas({ cuentas, onAbrir, onAgregar }: { cuentas: CuentaVista[]; onAbrir: (id: string) => void; onAgregar: () => void }) {
  return (
    <section className="space-y-3.5">
      <h2 className="font-display text-[18px] font-bold">Cuentas</h2>

      <div className="flex h-16 items-center gap-3 rounded-16 border border-edge bg-surface px-3">
        <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-bg-muted dark:bg-surface-2">
          <CreditCard size={18} />
        </span>
        <span className="min-w-0 flex-1 text-[13px] font-semibold">Agregar cuenta</span>
        <button type="button" onClick={onAgregar} className="btn-primary h-8 px-4 text-[11px]">
          Agregar
        </button>
      </div>

      <div className="snap-x-carousel -mx-3.5 px-3.5 md:mx-0 md:px-0">
        <button
          type="button"
          onClick={onAgregar}
          className="flex w-[236px] flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed border-line-dashed bg-bg-hover transition-transform duration-[180ms] hover:-translate-y-[3px] dark:border-edge-2 dark:bg-surface-2"
          style={{ aspectRatio: '1.62' }}
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-green text-white">
            <Plus size={22} strokeWidth={2.5} />
          </span>
          <span className="text-[14px] font-bold">Agregar tarjeta</span>
          <span className="text-[11px] text-txt-2 dark:text-fg-2">Crédito, débito o inversión</span>
        </button>
        {cuentas.map((c, i) => {
          const esCredito = c.tipo === 'credito';
          return (
            <button key={c.id} type="button" onClick={() => onAbrir(c.id)} className="w-[236px] text-left transition-transform duration-[180ms] animate-rise hover:-translate-y-[3px]" style={{ animationDelay: `${80 + i * 70}ms` }}>
              <Plastico cuenta={c} />
              <div className="mt-2 px-1">
                <div className="truncate text-[13px] font-bold">{c.nombre}</div>
                <div className="text-[12.5px] font-bold">
                  <Money value={c.saldo} tone={esCredito ? 'blue' : 'green'} className="font-body" />
                  <span className="ml-1 font-normal text-txt-2 dark:text-fg-2">{esCredito ? 'deuda' : c.tipo === 'inversion' ? 'valor' : 'saldo'}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
