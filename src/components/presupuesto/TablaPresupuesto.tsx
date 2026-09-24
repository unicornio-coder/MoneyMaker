'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/cn';
import { money } from '@/lib/format';
import { categoria } from '@/lib/domain/categorias';
import type { LineaVsActual } from '@/lib/domain/presupuesto';
import { actualizarLimite } from '@/app/app/presupuesto/acciones';

function Fila({ presupuestoId, l }: { presupuestoId: string; l: LineaVsActual }) {
  const [valor, setValor] = useState(String(Math.round(l.limite)));
  const [pendiente, start] = useTransition();
  const router = useRouter();
  const cat = categoria(l.categoriaId);
  const guardar = () => {
    const n = Number(valor);
    if (!(n >= 0) || n === l.limite) return;
    start(async () => {
      await actualizarLimite(presupuestoId, l.categoriaId, n);
      router.refresh();
    });
  };
  const pctBarra = Math.min(100, l.pct);
  return (
    <div className={cn('rounded-card px-3.5 py-3 transition-all duration-[250ms]', l.excedido ? 'bg-ink text-white shadow-exceeded' : 'card')}>
      <div className="grid grid-cols-[minmax(0,2.2fr)_minmax(0,0.95fr)_minmax(0,0.95fr)_minmax(0,0.95fr)_34px] items-center gap-1.5 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_44px] sm:gap-2 text-[12.5px]">
        <div className="flex min-w-0 items-center gap-2 font-bold">
          <span className="h-2 w-2 flex-none rounded-full ring-1 ring-black/10 dark:ring-white/30" style={{ background: l.excedido ? '#4ADE80' : cat.color }} />
          <span className="line-clamp-2 leading-tight sm:truncate">{l.nombre ?? cat.nombre}</span>
        </div>
        <div>
          <input
            value={valor}
            onChange={(e) => setValor(e.target.value.replace(/[^\d]/g, ''))}
            onBlur={guardar}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            inputMode="numeric"
            aria-label={`Presupuesto de ${cat.nombre}`}
            className={cn('h-8 w-full rounded-[8px] border px-2 text-right font-display text-[13px] font-bold outline-none', l.excedido ? 'border-white/20 bg-white/10 text-white focus:border-green-light' : 'border-line-input bg-bg-input focus:border-green dark:border-edge dark:bg-surface-2', pendiente && 'opacity-60')}
          />
        </div>
        <div className={cn('rounded-[8px] px-2 py-1.5 text-right font-display text-[13px] font-bold', l.excedido ? 'bg-white/10' : 'bg-[rgba(127,140,134,0.12)]')}>{money(l.actual)}</div>
        <div className={cn('text-right font-display text-[13px] font-bold', l.excedido ? 'text-green-light' : l.diferencia >= 0 ? 'text-green' : 'text-negative')}>{l.diferencia >= 0 ? '' : '-'}{money(Math.abs(l.diferencia))}</div>
        <div className={cn('text-right text-[12px] font-bold', l.excedido ? 'text-white' : 'text-txt-2 dark:text-fg-2')}>{Math.round(l.pct)}%</div>
      </div>
      <div className={cn('mt-2 h-1.5 w-full rounded-pill', l.excedido ? 'bg-white/12' : 'bg-line dark:bg-surface-2')}>
        <div className={cn('h-1.5 rounded-pill transition-[width] duration-[550ms] ease-bounce', l.excedido ? 'bg-green-light' : 'bg-green')} style={{ width: `${pctBarra}%` }} />
      </div>
    </div>
  );
}

export function TablaPresupuesto({ presupuestoId, lineas }: { presupuestoId: string; lineas: LineaVsActual[] }) {
  return (
    <section className="space-y-2">
      <div className="grid grid-cols-[minmax(0,2.2fr)_minmax(0,0.95fr)_minmax(0,0.95fr)_minmax(0,0.95fr)_34px] gap-1.5 px-3.5 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_44px] sm:gap-2 text-[9px] font-bold uppercase tracking-[0.3px] text-txt-2 dark:text-fg-2 md:text-[10.3px] md:tracking-[0.9px]">
        <span>Categoría</span><span className="text-right">Presup.</span><span className="text-right">Actual</span><span className="text-right">Difer.</span><span className="text-right">%</span>
      </div>
      {lineas.length === 0 && <p className="card px-4 py-8 text-center text-[12.5px] text-txt-2">Sin líneas todavía. Crea una con &quot;Nuevo presupuesto&quot;.</p>}
      {lineas.map((l) => <Fila key={l.categoriaId} presupuestoId={presupuestoId} l={l} />)}
      <p className="px-1 pt-1 text-[11px] text-txt-3">Edita el monto de Presupuesto y presiona Enter. La fila se pone oscura cuando el gasto real supera el límite.</p>
    </section>
  );
}
