'use client';

import { useState } from 'react';
import { cn } from '@/lib/cn';
import { money } from '@/lib/format';
import { categoria } from '@/lib/domain/categorias';
import { iconoCategoria } from '@/lib/domain/categoriaIconos';

type Props = { porCategoria: { categoriaId: string; monto: number; movimientos: number }[]; total: number; seleccion: string | null; onSeleccion: (id: string | null) => void };

/** Tiles por categoría con icono y monto: 4 principales y "Ver todas". Tocar una filtra la tabla de abajo. */
export function TilesCategorias({ porCategoria, total, seleccion, onSeleccion }: Props) {
  const [todas, setTodas] = useState(false);
  const lista = todas ? porCategoria : porCategoria.slice(0, 4);
  if (!porCategoria.length) return null;
  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-[19px] font-bold tracking-[-0.3px]">Por categoría</h2>
        {porCategoria.length > 4 && (
          <button type="button" onClick={() => setTodas((v) => !v)} className="text-[12.5px] font-semibold text-green-dark dark:text-green-light">{todas ? 'Ver menos' : `Ver todas (${porCategoria.length})`}</button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {lista.map((c, i) => {
          const cat = categoria(c.categoriaId);
          const Icon = iconoCategoria(c.categoriaId);
          const on = seleccion === c.categoriaId;
          return (
            <button
              key={c.categoriaId}
              type="button"
              aria-pressed={on}
              onClick={() => onSeleccion(on ? null : c.categoriaId)}
              className={cn('rounded-card-lg p-4 text-left shadow-card transition-all duration-[180ms] animate-rise hover:-translate-y-0.5', on ? 'bg-ink text-white dark:bg-white dark:text-ink' : 'bg-surface text-fg')}
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <span className={cn('flex h-9 w-9 items-center justify-center rounded-full', on ? 'bg-white/15 dark:bg-ink/10' : 'text-white')} style={on ? undefined : { background: cat.color }}><Icon size={17} /></span>
              <div className={cn('mt-3 truncate text-[12.5px] font-semibold', on ? 'text-white/80 dark:text-ink/70' : 'text-txt-2 dark:text-fg-2')}>{cat.nombre}</div>
              <div className="font-display text-[20px] font-bold leading-tight tracking-[-0.5px]">{money(c.monto)}</div>
              <div className={cn('text-[11px]', on ? 'text-white/60 dark:text-ink/60' : 'text-txt-3')}>{Math.round((c.monto / Math.max(1, total)) * 100)} % · {c.movimientos === 1 ? '1 movimiento' : `${c.movimientos} movimientos`}</div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
