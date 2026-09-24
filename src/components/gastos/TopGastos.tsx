'use client';

import { money } from '@/lib/format';
import { categoria } from '@/lib/domain/categorias';
import { diasDelRango, type Rango } from '@/lib/domain/quincena';
import { gastoPorCategoria, variacion } from '@/lib/domain/series';
import type { Movimiento } from '@/lib/domain/tipos';
import { Money } from '@/components/ui/Money';

type Props = { movimientos: Movimiento[]; anteriores: Movimiento[]; rango: Rango; onCategoria: (id: string) => void };

export function TopGastos({ movimientos, anteriores, rango, onCategoria }: Props) {
  const gastos = movimientos.filter((m) => m.tipo === 'gasto');
  const total = gastos.reduce((s, m) => s + m.monto, 0);
  const totalAnterior = anteriores.filter((m) => m.tipo === 'gasto').reduce((s, m) => s + m.monto, 0);
  const varTotal = variacion(total, totalAnterior);
  const porCat = gastoPorCategoria(movimientos, rango);
  const segmentos = porCat.slice(0, 5);
  const resto = porCat.slice(5).reduce((s, c) => s + c.monto, 0);
  const contexto = [`${money(total / Math.max(1, diasDelRango(rango)))} al día`, varTotal == null ? null : varTotal === 0 ? 'igual que el periodo anterior' : `${Math.abs(varTotal).toFixed(0)} % ${varTotal > 0 ? 'más' : 'menos'} que el periodo anterior`].filter(Boolean).join(' · ');

  return (
    <section className="card rounded-card-lg p-[18px]">
      <div className="text-[12px] text-txt-2 dark:text-fg-2">Gasto total · {rango.etiqueta}</div>
      <div className="mt-0.5 font-display text-[30px] font-bold leading-none tracking-[-1px]">
        <Money value={total} className="font-display" />
      </div>
      {gastos.length > 0 && <div className="mt-2 text-[12px] text-txt-2 dark:text-fg-2">{contexto}</div>}

      {total > 0 && (
        <div className="mt-4 flex h-3.5 gap-1 overflow-hidden rounded-[7px]">
          {segmentos.map((c) => {
            const p = (c.monto / total) * 100;
            return (
              <span key={c.categoriaId} className="flex h-full items-center justify-center rounded-[7px] text-[9px] font-bold text-white transition-[flex] duration-[320ms]" style={{ flex: Math.max(p, 3), background: categoria(c.categoriaId).color }}>
              </span>
            );
          })}
          {resto > 0 && <span className="rounded-[7px] bg-line-dashed" style={{ flex: Math.max((resto / total) * 100, 3) }} />}
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        {porCat.slice(0, 6).map((c) => {
          const cat = categoria(c.categoriaId);
          return (
            <button key={c.categoriaId} type="button" onClick={() => onCategoria(c.categoriaId)} className="rounded-card border border-edge px-3 py-2.5 text-left transition-colors hover:bg-bg-hover dark:hover:bg-surface-2">
              <div className="flex items-center gap-1.5 text-[11.5px] font-semibold" style={{ color: cat.color }}>
                <span className="h-2 w-2 rounded-full" style={{ background: cat.color }} />
                <span className="truncate text-fg">{cat.nombre}</span>
              </div>
              <div className="mt-1 font-display text-[17px] font-bold">{money(c.monto)}</div>
              <div className="text-[10.5px] text-txt-2 dark:text-fg-2">{Math.round((c.monto / total) * 100)} % del gasto</div>
            </button>
          );
        })}
      </div>

    </section>
  );
}
