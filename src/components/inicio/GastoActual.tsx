'use client';

import { useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { money } from '@/lib/format';
import { seriePeriodos, variacion } from '@/lib/domain/series';
import { deISO } from '@/lib/domain/fechas';
import type { Movimiento } from '@/lib/domain/tipos';
import { useUI } from '@/lib/store/ui';
import { Money } from '@/components/ui/Money';
import { ChipGroup } from '@/components/ui/Chip';

const ALTO = 132;

export function GastoActual({ movimientos, diasPago, hoy }: { movimientos: Movimiento[]; diasPago: number[]; hoy: string }) {
  const periodoGlobal = useUI((s) => s.periodo);
  const setPeriodoGlobal = useUI((s) => s.setPeriodo);
  const periodo = periodoGlobal === 'anio' ? 'mes' : periodoGlobal;
  const serie = useMemo(() => seriePeriodos(movimientos, periodo, 6, deISO(hoy), diasPago), [movimientos, periodo, hoy, diasPago]);
  const [sel, setSel] = useState(5);
  const idx = Math.min(sel, serie.length - 1);
  const punto = serie[idx];
  const anterior = serie[idx - 1];
  const varPct = anterior ? variacion(punto.gasto, anterior.gasto) : null;
  const max = Math.max(1, ...serie.map((p) => Math.max(p.ingreso, p.gasto + Math.max(0, p.ingreso - p.gasto))));

  return (
    <section className="card px-[18.7px] py-[17px]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[12.9px] font-semibold text-txt-2 dark:text-fg-2">Gasto actual</div>
          <Money value={punto.gasto} animate className="mt-0.5 block text-[27.5px] font-bold leading-none tracking-[-1.1px]" tone="ink" />
        </div>
        <div className="flex flex-col items-end gap-2">
          <ChipGroup value={periodo} onChange={(v) => setPeriodoGlobal(v)} options={[{ value: 'q', label: 'Quincena' }, { value: 'mes', label: 'Mes' }]} size="sm" />
          {varPct != null && (
            <span className={cn('inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-[11px] font-semibold', varPct <= 0 ? 'bg-green-50 text-green dark:bg-surface-2 dark:text-green-light' : 'bg-negative-50 text-negative dark:bg-surface-2')}>
              {varPct <= 0 ? <ArrowDownRight size={13} /> : <ArrowUpRight size={13} />}
              {Math.abs(varPct).toFixed(0)} % vs {periodo === 'q' ? 'quincena' : 'mes'} anterior
            </span>
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-6 gap-1 md:gap-2">
        {serie.map((p, i) => {
          const activo = i === idx;
          // Pastilla apilada: gasto abajo (tinta), ingreso restante arriba (verde). Si el gasto supera el ingreso, todo tinta.
          const restante = Math.max(0, p.ingreso - p.gasto);
          const hGasto = (Math.min(p.gasto, max) / max) * ALTO;
          const hIngreso = (restante / max) * ALTO;
          return (
            <button key={p.rango.inicio} type="button" onClick={() => setSel(i)} className="group flex flex-col items-center gap-2 focus:outline-none" aria-pressed={activo} aria-label={`${p.rango.corta}: ingreso ${money(p.ingreso)}, gasto ${money(p.gasto)}`}>
              <div className="flex h-8 flex-col items-center justify-end text-[10.5px] font-bold leading-tight">
                {activo && (
                  <>
                    <span className="animate-rise text-green" style={{ animationDelay: '0ms' }}>{money(p.ingreso)}</span>
                    <span className="animate-rise text-fg" style={{ animationDelay: '60ms' }}>{money(p.gasto)}</span>
                  </>
                )}
              </div>
              <div
                className={cn('relative flex w-3.5 flex-col justify-end overflow-hidden rounded-pill bg-line transition-transform duration-[300ms] ease-bounce dark:bg-surface-2', activo && 'scale-x-125 shadow-hover')}
                style={{ height: ALTO }}
              >
                <div className={cn('w-full rounded-pill transition-[height] duration-[550ms] ease-bounce', activo ? 'bg-green-light' : 'bg-green-200 dark:bg-green-light/30')} style={{ height: hIngreso }} />
                <div className={cn('w-full rounded-pill transition-[height] duration-[550ms] ease-bounce', activo ? 'bg-ink dark:bg-white' : 'bg-txt-inactive dark:bg-white/30')} style={{ height: hGasto }} />
              </div>
              <span className={cn('whitespace-nowrap rounded-pill px-1.5 py-0.5 text-[10.5px] font-semibold transition-all duration-[180ms] md:px-2 md:text-[11px]', activo ? 'scale-[1.08] bg-ink text-white dark:bg-white dark:text-ink' : 'text-txt-2 dark:text-fg-2')}>{p.rango.corta}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center gap-4 text-[11px] font-semibold text-txt-2 dark:text-fg-2">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-green-light" /> Ingresos</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-ink dark:bg-white" /> Gastos</span>
        <span className="ml-auto font-normal">{punto.rango.etiqueta}</span>
      </div>
    </section>
  );
}
