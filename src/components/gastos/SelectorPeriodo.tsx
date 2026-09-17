'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/cn';
import { desplazar, rangoPersonalizado, type Rango } from '@/lib/domain/quincena';
import { ChipGroup } from '@/components/ui/Chip';

export type ModoPeriodo = 'semana' | 'mes' | 'rango';

type Props = { modo: ModoPeriodo; onModo: (m: ModoPeriodo) => void; rango: Rango; onRango: (r: Rango) => void };

export function SelectorPeriodo({ modo, onModo, rango, onRango }: Props) {
  const [abierto, setAbierto] = useState(false);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ChipGroup value={modo} onChange={(m) => { onModo(m); setAbierto(m === 'rango'); }} options={[{ value: 'semana', label: 'Semana' }, { value: 'mes', label: 'Mes' }, { value: 'rango', label: 'Personalizado' }]} size="sm" />
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Anterior" onClick={() => onRango(desplazar(rango, -1))} className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-surface shadow-card hover:bg-bg-hover dark:hover:bg-surface-2"><ChevronLeft size={18} /></button>
          <button type="button" onClick={() => modo === 'rango' && setAbierto((v) => !v)} className={cn('flex h-[34px] items-center gap-1.5 rounded-pill px-3 text-[12.5px] font-bold', modo === 'rango' ? 'bg-surface shadow-card' : '')}>
            {modo === 'rango' && <CalendarDays size={14} />}
            {rango.etiqueta}
          </button>
          <button type="button" aria-label="Siguiente" onClick={() => onRango(desplazar(rango, 1))} className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-surface shadow-card hover:bg-bg-hover dark:hover:bg-surface-2"><ChevronRight size={18} /></button>
        </div>
      </div>
      {modo === 'rango' && abierto && (
        <div className="card animate-screen flex flex-wrap items-end gap-3 p-4">
          <label className="block flex-1">
            <span className="mb-1 block text-[11.5px] font-semibold text-txt-2 dark:text-fg-2">Del</span>
            <input type="date" value={rango.inicio} max={rango.fin} onChange={(e) => e.target.value && onRango(rangoPersonalizado(e.target.value, rango.fin))} className="input text-[13px]" />
          </label>
          <label className="block flex-1">
            <span className="mb-1 block text-[11.5px] font-semibold text-txt-2 dark:text-fg-2">Al</span>
            <input type="date" value={rango.fin} min={rango.inicio} onChange={(e) => e.target.value && onRango(rangoPersonalizado(rango.inicio, e.target.value))} className="input text-[13px]" />
          </label>
          <button type="button" onClick={() => onRango(rangoPersonalizado(rango.fin, rango.fin))} className="h-11 rounded-pill border border-line-2 px-4 text-[12px] font-semibold hover:bg-bg-hover dark:border-edge">Solo un día</button>
        </div>
      )}
    </div>
  );
}
