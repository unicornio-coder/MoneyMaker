'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { money, moneyShort } from '@/lib/format';
import { deISO, sumarMeses } from '@/lib/domain/fechas';
import { enRango, mesDe, type Rango } from '@/lib/domain/quincena';
import type { Movimiento } from '@/lib/domain/tipos';

const ALTO = 150;

type Props = { movimientos: Movimiento[]; cuentaId: string | null; rango: Rango; hoy: string; onElegirMes: (r: Rango) => void };

export function BarrasMes({ movimientos, cuentaId, rango, hoy, onElegirMes }: Props) {
  const [desplazamiento, setDesplazamiento] = useState(0);
  const meses = useMemo(() => {
    const base = sumarMeses(deISO(hoy), desplazamiento);
    return Array.from({ length: 6 }, (_, i) => mesDe(sumarMeses(base, i - 5)));
  }, [hoy, desplazamiento]);
  const serie = useMemo(
    () => meses.map((r) => ({ rango: r, gasto: movimientos.filter((m) => m.tipo === 'gasto' && enRango(m.fecha, r) && (!cuentaId || m.cuentaId === cuentaId)).reduce((s, m) => s + m.monto, 0) })),
    [meses, movimientos, cuentaId],
  );
  const max = Math.max(1, ...serie.map((p) => p.gasto));
  // Rejilla: 4 líneas a valores redondos
  const paso = Math.pow(10, Math.floor(Math.log10(max))) / 2;
  const tope = Math.ceil(max / paso) * paso;
  const lineas = [0.25, 0.5, 0.75, 1].map((f) => f * tope);
  const activoInicio = rango.periodo === 'mes' ? rango.inicio : mesDe(deISO(rango.inicio)).inicio;

  return (
    <section className="card rounded-sheet p-4 md:p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-[13px] font-bold">Gasto por mes</div>
        <div className="flex gap-1">
          <button type="button" aria-label="Meses anteriores" onClick={() => setDesplazamiento((d) => d - 6)} className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-bg-muted hover:bg-line dark:bg-surface-2"><ChevronLeft size={18} /></button>
          <button type="button" aria-label="Meses siguientes" disabled={desplazamiento >= 0} onClick={() => setDesplazamiento((d) => Math.min(0, d + 6))} className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-bg-muted hover:bg-line disabled:opacity-40 dark:bg-surface-2"><ChevronRight size={18} /></button>
        </div>
      </div>
      <div className="relative" style={{ height: ALTO + 56 }}>
        {lineas.map((v) => (
          <div key={v} className="absolute left-0 right-0 flex items-center gap-2" style={{ top: 24 + ALTO - (v / tope) * ALTO }}>
            <span className="w-9 text-right text-[10px] text-txt-3">{moneyShort(v)}</span>
            <span className="h-px flex-1 border-t border-dashed border-line-grid dark:border-edge" />
          </div>
        ))}
        <div className="absolute bottom-0 left-11 right-0 top-6 grid grid-cols-6 items-end gap-2">
          {serie.map((p) => {
            const activo = p.rango.inicio === activoInicio;
            const h = tope > 0 ? (p.gasto / tope) * ALTO : 0;
            return (
              <button key={p.rango.inicio} type="button" onClick={() => onElegirMes(p.rango)} className="flex flex-col items-center gap-2 focus:outline-none" aria-pressed={activo}>
                <span className={cn('h-4 text-[10.3px] font-bold', activo ? 'text-fg' : 'text-transparent')}>{money(p.gasto)}</span>
                <span className="flex items-end" style={{ height: ALTO }}>
                  <span className={cn('block w-4 rounded-pill transition-all duration-[320ms] ease-out', activo ? 'bg-negative' : 'bg-negative-soft dark:bg-negative/30')} style={{ height: Math.max(4, h) }} />
                </span>
                <span className={cn('rounded-pill px-2 py-0.5 text-[11px] font-semibold transition-colors', activo ? 'bg-negative text-white' : 'text-txt-2 dark:text-fg-2')}>{p.rango.corta}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
