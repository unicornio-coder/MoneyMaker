'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/cn';
import { money } from '@/lib/format';
import { categoria } from '@/lib/domain/categorias';
import { iconoCategoria } from '@/lib/domain/categoriaIconos';
import type { LineaVsActual } from '@/lib/domain/presupuesto';
import { actualizarLimite } from '@/app/app/presupuesto/acciones';

/** Una categoría: icono, nombre, barra de avance, gastado y límite editable. */
function Fila({ presupuestoId, l, i }: { presupuestoId: string; l: LineaVsActual; i: number }) {
  const [valor, setValor] = useState(String(Math.round(l.limite)));
  const [pendiente, start] = useTransition();
  const router = useRouter();
  const cat = categoria(l.categoriaId);
  const Icon = iconoCategoria(l.categoriaId);
  const guardar = () => {
    const n = Number(valor);
    if (!(n >= 0) || n === l.limite) return;
    start(async () => {
      await actualizarLimite(presupuestoId, l.categoriaId, n);
      router.refresh();
    });
  };
  const restante = l.limite - l.actual;
  return (
    <li className={cn('px-4 py-3.5 animate-rise', l.excedido && 'bg-negative-50/60 dark:bg-surface-2')} style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}>
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full text-white" style={{ background: cat.color }}><Icon size={18} /></span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate text-[14px] font-bold">{l.nombre ?? cat.nombre}</span>
            <span className={cn('flex-none text-[12px] font-semibold', l.excedido ? 'text-negative' : 'text-txt-2 dark:text-fg-2')}>{l.excedido ? `${money(-restante)} de más` : `${money(restante)} libres`}</span>
          </div>
          <div className="mt-1.5 h-1.5 w-full rounded-pill bg-line dark:bg-surface-2">
            <div className={cn('h-1.5 rounded-pill transition-[width] duration-[550ms] ease-bounce', l.excedido ? 'bg-negative' : l.pct >= 80 ? 'bg-ink dark:bg-white' : 'bg-green')} style={{ width: `${Math.min(100, l.pct)}%` }} />
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-2 text-[12px] text-txt-2 dark:text-fg-2">
            <span><b className="font-display text-[13px] text-fg">{money(l.actual)}</b> gastado</span>
            <label className="flex items-center gap-1.5">
              <span>de</span>
              <span className="relative">
                <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 font-display text-[13px] font-bold text-fg">$</span>
                <input
                  value={valor ? Number(valor).toLocaleString('es-MX') : ''}
                  onChange={(e) => setValor(e.target.value.replace(/[^\d]/g, ''))}
                  onBlur={guardar}
                  onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                  inputMode="numeric"
                  aria-label={`Presupuesto de ${cat.nombre}`}
                  className={cn('h-8 w-[100px] rounded-[8px] border border-line-input bg-bg-input pl-5 pr-2 text-right font-display text-[13px] font-bold text-fg outline-none focus:border-green dark:border-edge dark:bg-surface-2', pendiente && 'opacity-60')}
                />
              </span>
            </label>
          </div>
        </div>
      </div>
    </li>
  );
}

export function TablaPresupuesto({ presupuestoId, lineas }: { presupuestoId: string; lineas: LineaVsActual[] }) {
  if (!lineas.length) return <p className="card px-4 py-8 text-center text-[12.5px] text-txt-2">Sin categorías todavía. Agrega una o sube tu Excel.</p>;
  return (
    <ul className="card divide-y divide-edge overflow-hidden p-0">
      {lineas.map((l, i) => <Fila key={l.categoriaId} presupuestoId={presupuestoId} l={l} i={i} />)}
    </ul>
  );
}
