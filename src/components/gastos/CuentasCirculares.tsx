'use client';

import Link from 'next/link';
import { Check, Plus } from 'lucide-react';
import { cn } from '@/lib/cn';
import { money } from '@/lib/format';
import type { Cuenta, Movimiento } from '@/lib/domain/tipos';
import { Avatar } from '@/components/ui/Avatar';

type Props = { cuentas: Cuenta[]; movimientos: Movimiento[]; seleccion: string | null; onSeleccion: (id: string | null) => void };

export function CuentasCirculares({ cuentas, movimientos, seleccion, onSeleccion }: Props) {
  const gastoDe = (id: string | null) => movimientos.filter((m) => m.tipo === 'gasto' && (!id || m.cuentaId === id)).reduce((s, m) => s + m.monto, 0);
  const Circulo = ({ activo, children, onClick, label, sub }: { activo: boolean; children: React.ReactNode; onClick: () => void; label: string; sub: string }) => (
    <button type="button" onClick={onClick} className="flex w-[76px] flex-none flex-col items-center gap-1.5">
      <span className={cn('relative flex h-14 w-14 items-center justify-center rounded-full transition-all duration-[180ms]', activo ? 'ring-[3px] ring-green ring-offset-2 ring-offset-canvas' : '')}>
        {children}
        {activo && <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-green text-white ring-2 ring-canvas"><Check size={12} strokeWidth={3} /></span>}
      </span>
      <span className="w-full truncate text-center text-[11px] font-bold">{label}</span>
      <span className="text-[10.5px] text-txt-2 dark:text-fg-2">{sub}</span>
    </button>
  );

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-display text-[16px] font-bold">Cuentas</h2>
        {seleccion && <button type="button" onClick={() => onSeleccion(null)} className="text-[12px] font-semibold text-green-dark dark:text-green-light">Ver todas</button>}
      </div>
      <div className="-mx-3.5 flex gap-2 overflow-x-auto px-3.5 pb-1 md:mx-0 md:px-0">
        <Link href="/app/importar" className="flex w-[76px] flex-none flex-col items-center gap-1.5">
          <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-line-dashed text-txt-2 dark:border-edge-2"><Plus size={20} /></span>
          <span className="text-[11px] font-bold">Agregar</span>
          <span className="text-[10.5px] text-txt-2 dark:text-fg-2">cuenta</span>
        </Link>
        <Circulo activo={seleccion === null} onClick={() => onSeleccion(null)} label="Todas" sub={money(gastoDe(null))}>
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-ink font-display text-[14px] font-bold text-white dark:bg-white dark:text-ink">{cuentas.length}</span>
        </Circulo>
        {cuentas.map((c) => (
          <Circulo key={c.id} activo={seleccion === c.id} onClick={() => onSeleccion(seleccion === c.id ? null : c.id)} label={c.nombre} sub={money(gastoDe(c.id))}>
            {c.tipo === 'efectivo' ? (
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-green font-display text-[20px] font-bold text-white">$</span>
            ) : (
              <Avatar domain={c.bancoDominio} nombre={c.banco} size={56} logoPct={56} />
            )}
          </Circulo>
        ))}
      </div>
    </section>
  );
}
