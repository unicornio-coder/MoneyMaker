'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/cn';
import { money } from '@/lib/format';
import { categoria } from '@/lib/domain/categorias';
import { iconoCategoria } from '@/lib/domain/categoriaIconos';
import { Money } from '@/components/ui/Money';

type Fila = { categoriaId: string; monto: number; movimientos: number };
type Props = { porCategoria: Fila[]; total: number; seleccion: string | null; onSeleccion: (id: string | null) => void };

// Colores de la paleta, por orden de tamaño de la rebanada. `stroke` pinta la rebanada (currentColor), `bg`/`fg` el icono de la lista.
const PALETA = [
  { stroke: 'text-ink dark:text-white', bg: 'bg-ink dark:bg-white', fg: 'text-white dark:text-ink' },
  { stroke: 'text-green', bg: 'bg-green', fg: 'text-white' },
  { stroke: 'text-negative', bg: 'bg-negative', fg: 'text-white' },
  { stroke: 'text-invest', bg: 'bg-invest', fg: 'text-white' },
  { stroke: 'text-green-light', bg: 'bg-green-light', fg: 'text-ink' },
  { stroke: 'text-txt-inactive', bg: 'bg-txt-inactive', fg: 'text-white' },
  { stroke: 'text-green-dark', bg: 'bg-green-dark', fg: 'text-white' },
  { stroke: 'text-negative-soft', bg: 'bg-negative-soft', fg: 'text-ink' },
  { stroke: 'text-green-200', bg: 'bg-green-200', fg: 'text-ink' },
  { stroke: 'text-invest-soft', bg: 'bg-invest-soft', fg: 'text-ink' },
];
const VISIBLES = 5;
const R = 78;
const C = 2 * Math.PI * R;
const HUECO = 2.5;

/**
 * Gastos por categoría: pastel (SVG propio) con la lista al lado. Tocar una rebanada o una fila la selecciona: la
 * rebanada crece, las demás se atenúan y el centro muestra su cifra; la tabla de movimientos de abajo se filtra.
 * "Ver más" despliega todas las categorías.
 */
export function GraficaCategorias({ porCategoria, total, seleccion, onSeleccion }: Props) {
  const [todas, setTodas] = useState(false);
  const [listo, setListo] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setListo(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const rebanadas = useMemo(() => {
    let inicio = 0;
    return porCategoria.map((c, i) => {
      const frac = total > 0 ? c.monto / total : 0;
      const r = { ...c, i, frac, inicio, color: PALETA[i % PALETA.length] };
      inicio += frac;
      return r;
    });
  }, [porCategoria, total]);
  if (!porCategoria.length) return null;

  const sel = rebanadas.find((r) => r.categoriaId === seleccion) ?? null;
  const lista = todas ? rebanadas : rebanadas.slice(0, VISIBLES);
  const alternar = (id: string) => onSeleccion(seleccion === id ? null : id);

  return (
    <section className="card p-4 md:p-5" aria-label="Gastos por categoría">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-[19px] font-bold tracking-[-0.3px]">Por categoría</h2>
        {sel && <button type="button" onClick={() => onSeleccion(null)} className="text-[12.5px] font-semibold text-green-dark dark:text-green-light">Ver todo</button>}
      </div>

      <div className="mt-3 md:flex md:items-center md:gap-6">
        <div className="relative mx-auto h-[210px] w-[210px] flex-none">
          <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden>
            <g transform="rotate(-90 100 100)">
              {rebanadas.map((r) => {
                const largo = Math.max(0, r.frac * C - (rebanadas.length > 1 ? HUECO : 0));
                const on = sel?.categoriaId === r.categoriaId;
                return (
                  <circle
                    key={r.categoriaId}
                    cx="100"
                    cy="100"
                    r={R}
                    fill="none"
                    stroke="currentColor"
                    className={cn('cursor-pointer transition-all duration-[600ms] ease-bounce', r.color.stroke)}
                    strokeWidth={on ? 34 : 24}
                    strokeDasharray={listo ? `${largo} ${C - largo}` : `0 ${C}`}
                    strokeDashoffset={-(r.inicio * C + (rebanadas.length > 1 ? HUECO / 2 : 0))}
                    opacity={sel && !on ? 0.28 : 1}
                    onClick={() => alternar(r.categoriaId)}
                  />
                );
              })}
            </g>
          </svg>
          <div key={sel?.categoriaId ?? 'total'} className="pointer-events-none absolute inset-0 flex animate-rise flex-col items-center justify-center px-9 text-center">
            <div className="truncate text-[11.5px] font-semibold text-txt-2 dark:text-fg-2">{sel ? categoria(sel.categoriaId).nombre : 'Total'}</div>
            <Money value={sel ? sel.monto : total} tone="ink" className="block text-[22px] font-bold leading-tight tracking-[-0.7px]" />
            <div className="text-[11px] text-txt-3">{sel ? `${Math.round(sel.frac * 100)} % del gasto` : `${rebanadas.length} ${rebanadas.length === 1 ? 'categoría' : 'categorías'}`}</div>
          </div>
        </div>

        <ul className="mt-2 min-w-0 flex-1 divide-y divide-edge md:mt-0">
          {lista.map((r) => {
            const cat = categoria(r.categoriaId);
            const Icon = iconoCategoria(r.categoriaId);
            const on = sel?.categoriaId === r.categoriaId;
            return (
              <li key={r.categoriaId} className="animate-rise" style={{ animationDelay: `${r.i * 35}ms` }}>
                <button type="button" aria-pressed={on} onClick={() => alternar(r.categoriaId)} className={cn('flex h-[54px] w-full items-center gap-3 rounded-input px-1.5 text-left transition-colors', on ? 'bg-bg-muted dark:bg-surface-2' : 'hover:bg-bg-hover dark:hover:bg-surface-2', sel && !on && 'opacity-60')}>
                  <span className={cn('flex h-8 w-8 flex-none items-center justify-center rounded-full', r.color.bg, r.color.fg)}><Icon size={15} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-bold">{cat.nombre}</span>
                    <span className="block text-[11px] text-txt-2 dark:text-fg-2">{r.movimientos === 1 ? '1 movimiento' : `${r.movimientos} movimientos`}</span>
                  </span>
                  <span className="text-right">
                    <Money value={r.monto} tone="ink" className="block text-[14px] font-bold" />
                    <span className="block text-[11px] text-txt-2 dark:text-fg-2">{Math.round(r.frac * 100)} %</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {rebanadas.length > VISIBLES && (
        <button type="button" onClick={() => setTodas((v) => !v)} className="mt-2 flex h-10 w-full items-center justify-center gap-1 rounded-input text-[13px] font-bold text-green-dark hover:bg-green-50 dark:text-green-light dark:hover:bg-surface-2">
          {todas ? <>Ver menos <ChevronUp size={15} /></> : <>Ver más ({rebanadas.length - VISIBLES} categorías) <ChevronDown size={15} /></>}
        </button>
      )}
      {sel && <p className="mt-1 px-1 text-[11.5px] text-txt-3">Abajo, los movimientos de {categoria(sel.categoriaId).nombre.toLowerCase()} · {money(sel.monto)}.</p>}
    </section>
  );
}
