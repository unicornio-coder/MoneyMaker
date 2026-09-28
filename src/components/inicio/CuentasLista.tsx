'use client';

import { ChevronRight, Plus } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Money } from '@/components/ui/Money';
import { Avatar } from '@/components/ui/Avatar';
import type { CuentaVista } from './tipos';

const TIPO: Record<string, string> = { credito: 'Tarjeta de crédito', debito: 'Cuenta', inversion: 'Inversión', efectivo: 'Efectivo' };

/** Cuentas vinculadas como lista: logo, nombre, tipo y saldo. "Agregar" abre la hoja de conexión. */
export function CuentasLista({ cuentas, fuentes, onAbrir, onAgregar }: { cuentas: CuentaVista[]; fuentes: { id: string; estado: string }[]; onAbrir: (id: string) => void; onAgregar: () => void }) {
  const estadoDe = (c: CuentaVista) => fuentes.find((f) => f.id === c.linkId)?.estado;
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-[19px] font-bold tracking-[-0.3px]">Cuentas</h2>
        <button type="button" onClick={onAgregar} className="btn-primary flex h-9 items-center gap-1.5 px-4 text-[12.5px]"><Plus size={15} strokeWidth={2.5} /> Agregar</button>
      </div>
      <ul className="card divide-y divide-edge overflow-hidden p-0">
        {cuentas.map((c, i) => {
          const estado = estadoDe(c);
          const pide = estado === 'mfa' || estado === 'roto';
          return (
            <li key={c.id} className={cn(i < 8 && 'animate-rise')} style={i < 8 ? { animationDelay: `${i * 45}ms` } : undefined}>
              <button type="button" onClick={() => onAbrir(c.id)} className="flex h-[66px] w-full items-center gap-3 px-4 text-left transition-colors hover:bg-bg-hover dark:hover:bg-surface-2">
                <Avatar domain={c.bancoDominio} nombre={c.banco} size={42} logoPct={62} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-bold">{c.nombre}</div>
                  <div className="truncate text-[11.5px] text-txt-2 dark:text-fg-2">
                    {TIPO[c.tipo] ?? 'Cuenta'}{c.ultimos4 ? ` ···· ${c.ultimos4}` : ''}{pide ? ' · Vuelve a conectar' : ''}
                  </div>
                </div>
                <div className="text-right">
                  <Money value={c.saldo} tone={c.tipo === 'credito' ? 'blue' : 'ink'} className="block text-[15px] font-bold" />
                  <div className="text-[11px] text-txt-3">{c.tipo === 'credito' ? 'por pagar' : c.tipo === 'inversion' ? 'valor' : 'disponible'}</div>
                </div>
                <ChevronRight size={16} className="flex-none text-txt-3" />
              </button>
            </li>
          );
        })}
        <li>
          <button type="button" onClick={onAgregar} className="flex h-[58px] w-full items-center gap-3 px-4 text-left text-[13.5px] font-bold text-green-dark transition-colors hover:bg-bg-hover dark:text-green-light dark:hover:bg-surface-2">
            <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full border-2 border-dashed border-line-dashed dark:border-edge-2"><Plus size={18} /></span>
            Conectar otro banco o subir un PDF
          </button>
        </li>
      </ul>
    </section>
  );
}
