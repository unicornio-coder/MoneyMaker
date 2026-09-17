'use client';

import { money, fechaCorta } from '@/lib/format';
import { categoria } from '@/lib/domain/categorias';
import type { Rango } from '@/lib/domain/quincena';
import type { Cuenta, Movimiento } from '@/lib/domain/tipos';
import { Panel } from '@/components/ui/Panel';
import { Avatar } from '@/components/ui/Avatar';
import { Money } from '@/components/ui/Money';

type Props = { categoriaId: string | null; movimientos: Movimiento[]; cuentas: Pick<Cuenta, 'id' | 'nombre'>[]; rango: Rango; onClose: () => void; onSeleccionar: (m: Movimiento) => void };

export function DetalleCategoria({ categoriaId, movimientos, cuentas, rango, onClose, onSeleccionar }: Props) {
  if (!categoriaId) return null;
  const cat = categoria(categoriaId);
  const lista = movimientos.filter((m) => m.tipo === 'gasto' && m.categoriaId === categoriaId);
  const total = lista.reduce((s, m) => s + m.monto, 0);
  const nombreCuenta = new Map(cuentas.map((c) => [c.id, c.nombre]));
  // Desglose por comercio
  const porComercio = new Map<string, { monto: number; n: number; dominio: string | null }>();
  for (const m of lista) {
    const a = porComercio.get(m.comercio) ?? { monto: 0, n: 0, dominio: m.comercioDominio ?? null };
    a.monto += m.monto;
    a.n += 1;
    porComercio.set(m.comercio, a);
  }
  const comercios = [...porComercio.entries()].sort((a, b) => b[1].monto - a[1].monto);

  return (
    <Panel open onClose={onClose} mode="drawer" title={<span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: cat.color }} />{cat.nombre}</span>}>
      <div className="space-y-4 pb-4">
        <div>
          <div className="text-[12px] text-txt-2 dark:text-fg-2">{rango.etiqueta} · {lista.length} movimientos</div>
          <Money value={total} className="text-[30px] font-bold tracking-[-1px]" />
        </div>
        <div>
          <div className="section-label mb-2">Por comercio</div>
          <div className="space-y-2">
            {comercios.map(([nombre, c]) => (
              <div key={nombre} className="flex items-center gap-3">
                <Avatar domain={c.dominio} nombre={nombre} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between text-[12.5px]"><span className="truncate font-bold">{nombre}</span><span className="font-display font-bold">{money(c.monto)}</span></div>
                  <div className="mt-1 h-1.5 rounded-pill bg-line dark:bg-surface-2"><div className="h-1.5 rounded-pill" style={{ width: `${(c.monto / total) * 100}%`, background: cat.color }} /></div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="section-label mb-2">Movimientos</div>
          <ul className="divide-y divide-edge">
            {lista.map((m) => (
              <li key={m.id}>
                <button type="button" onClick={() => onSeleccionar(m)} className="flex h-[58px] w-full items-center gap-3 text-left">
                  <Avatar domain={m.comercioDominio} nombre={m.comercio} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] font-bold">{m.comercio}</div>
                    <div className="text-[11px] text-txt-2 dark:text-fg-2">{fechaCorta(m.fecha)} · {nombreCuenta.get(m.cuentaId) ?? ''}</div>
                  </div>
                  <span className="font-display text-[14px] font-bold">{money(m.monto)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Panel>
  );
}
