'use client';

import { ArrowDownRight, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/cn';
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
  const mayor = gastos.reduce<Movimiento | null>((a, m) => (!a || m.monto > a.monto ? m : a), null);
  const porCat = gastoPorCategoria(movimientos, rango);
  const porCatAnt = new Map(gastoPorCategoria(anteriores, { ...rango, inicio: '0000-01-01', fin: '9999-12-31' }).map((c) => [c.categoriaId, c.monto]));
  const segmentos = porCat.slice(0, 5);
  const resto = porCat.slice(5).reduce((s, c) => s + c.monto, 0);
  const inteligentes = movimientos.filter((m) => m.categoriaFuente === 'llm' || m.categoriaFuente === 'proveedor').length;

  // Mini dona
  let acc = 0;
  const arcos = segmentos.map((c) => {
    const p = total ? (c.monto / total) * 100 : 0;
    const a = { color: categoria(c.categoriaId).color, dash: `${p.toFixed(2)} ${(100 - p).toFixed(2)}`, offset: (-acc).toFixed(2) };
    acc += p;
    return a;
  });

  return (
    <section className="card rounded-card-lg p-[18px]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[12px] text-txt-2 dark:text-fg-2">Gasto total · {rango.etiqueta}</div>
          <div className="mt-0.5 font-display text-[30px] font-bold leading-none tracking-[-1px]">
            <span className="align-top text-[16px]">$</span>
            <Money value={total} className="font-display" />
          </div>
        </div>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-bg-muted dark:bg-surface-2">
          <svg viewBox="0 0 36 36" className="h-[18px] w-[18px] -rotate-90">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#E3EFE6" strokeWidth="4" />
            {arcos.map((a, i) => (
              <circle key={i} cx="18" cy="18" r="15.9" fill="none" stroke={a.color} strokeWidth="4" strokeDasharray={a.dash} strokeDashoffset={a.offset} pathLength={100} />
            ))}
          </svg>
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 text-[10px] text-txt-2 dark:text-fg-2">
        <div><div>Promedio diario</div><div className="text-[13px] font-bold text-fg">{money(total / Math.max(1, diasDelRango(rango)))}</div></div>
        <div>
          <div>vs periodo anterior</div>
          <div className={cn('flex items-center gap-0.5 text-[13px] font-bold', varTotal == null ? 'text-fg' : varTotal > 0 ? 'text-negative' : 'text-green')}>
            {varTotal == null ? '—' : <>{varTotal > 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{Math.abs(varTotal).toFixed(0)} %</>}
          </div>
        </div>
        <div><div>Movimientos</div><div className="text-[13px] font-bold text-fg">{gastos.length}</div></div>
        <div><div>Mayor gasto</div><div className="truncate text-[13px] font-bold text-fg">{mayor ? `${money(mayor.monto)} · ${mayor.comercio}` : '—'}</div></div>
      </div>

      {total > 0 && (
        <div className="mt-4 flex h-3.5 gap-1 overflow-hidden rounded-[7px]">
          {segmentos.map((c) => {
            const p = (c.monto / total) * 100;
            return (
              <span key={c.categoriaId} className="flex h-full items-center justify-center rounded-[7px] text-[9px] font-bold text-white transition-[flex] duration-[320ms]" style={{ flex: Math.max(p, 3), background: categoria(c.categoriaId).color }}>
                {p >= 8 ? `${Math.round(p)}%` : ''}
              </span>
            );
          })}
          {resto > 0 && <span className="rounded-[7px] bg-line-dashed" style={{ flex: Math.max((resto / total) * 100, 3) }} />}
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        {porCat.slice(0, 6).map((c) => {
          const cat = categoria(c.categoriaId);
          const v = variacion(c.monto, porCatAnt.get(c.categoriaId) ?? 0);
          return (
            <button key={c.categoriaId} type="button" onClick={() => onCategoria(c.categoriaId)} className="rounded-card border border-edge px-3 py-2.5 text-left transition-colors hover:bg-bg-hover dark:hover:bg-surface-2">
              <div className="flex items-center gap-1.5 text-[11.5px] font-semibold" style={{ color: cat.color }}>
                <span className="h-2 w-2 rounded-full" style={{ background: cat.color }} />
                <span className="truncate text-fg">{cat.nombre}</span>
              </div>
              <div className="mt-1 font-display text-[17px] font-bold">{money(c.monto)}</div>
              <div className="flex items-center gap-1 text-[10.5px] text-txt-2 dark:text-fg-2">
                {Math.round((c.monto / total) * 100)} % del gasto
                {v != null && <span className={cn('inline-flex items-center', v > 0 ? 'text-negative' : 'text-green')}>{v > 0 ? '▲' : '▼'} {Math.abs(v).toFixed(0)} %</span>}
              </div>
            </button>
          );
        })}
      </div>

      {inteligentes > 0 && (
        <div className="mt-4 flex items-center gap-2 rounded-input bg-warning-soft px-3 py-2 text-[11.5px] dark:bg-surface-2">
          <CheckCircle2 size={15} className="text-warning" />
          <span><b>Categorías inteligentes:</b> {inteligentes} movimientos se clasificaron automáticamente. Toca uno para corregirlo.</span>
        </div>
      )}
    </section>
  );
}
