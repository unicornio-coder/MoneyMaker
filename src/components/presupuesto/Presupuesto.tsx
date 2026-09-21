'use client';

import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, RefreshCw, Wallet } from 'lucide-react';
import { cn } from '@/lib/cn';
import { money } from '@/lib/format';
import { deISO } from '@/lib/domain/fechas';
import { rangoDe } from '@/lib/domain/quincena';
import { presupuestoVsActual } from '@/lib/domain/presupuesto';
import type { Movimiento, Periodo, Presupuesto as PresupuestoT } from '@/lib/domain/tipos';
import { useUI } from '@/lib/store/ui';
import { ChipGroup } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { TEXTOS } from '@/lib/textos';
import { AnilloTicks } from './AnilloTicks';
import { TablaPresupuesto } from './TablaPresupuesto';
import { ModalNuevoPresupuesto } from './ModalNuevoPresupuesto';
import { reproponer } from '@/app/app/presupuesto/acciones';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

type Props = { presupuestos: Record<Periodo, PresupuestoT | null>; movimientos: Movimiento[]; diasPago: number[]; hoy: string };

export function Presupuesto({ presupuestos, movimientos, diasPago, hoy }: Props) {
  const periodo = useUI((s) => s.periodo);
  const setPeriodo = useUI((s) => s.setPeriodo);
  const [nuevo, setNuevo] = useState(false);
  const [pendiente, start] = useTransition();
  const router = useRouter();
  const h = deISO(hoy);
  const rango = useMemo(() => rangoDe(periodo, h, diasPago), [periodo, h, diasPago]);
  const p = presupuestos[periodo];
  const resumen = useMemo(() => (p ? presupuestoVsActual(p.lineas, movimientos, rango, p.ingreso, h) : null), [p, movimientos, rango, h]);

  if (!p || !resumen) {
    return <EmptyState icon={Wallet} titulo={TEXTOS.vacios.presupuesto.titulo} texto={TEXTOS.vacios.presupuesto.texto} cta={{ label: TEXTOS.vacios.presupuesto.cta, href: '/app/importar' }} />;
  }

  const pct = Math.min(999, resumen.pctGastado);

  return (
    <div className="mx-auto max-w-[760px] space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-[22px] font-bold tracking-[-0.5px]">{rango.etiqueta[0].toUpperCase() + rango.etiqueta.slice(1)}</h2>
        <div className="flex items-center gap-2">
          <ChipGroup value={periodo} onChange={setPeriodo} options={[{ value: 'q', label: 'Quincena' }, { value: 'mes', label: 'Mes' }, { value: 'anio', label: 'Año' }]} size="sm" className="md:hidden" />
          <button type="button" onClick={() => setNuevo(true)} className="btn-primary flex h-9 items-center gap-1.5 px-4 text-[12px]"><Plus size={15} /> Nuevo presupuesto</button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="card flex flex-col items-center rounded-card-xl px-5 py-6 text-center">
          <AnilloTicks pct={pct} />
          <div className="mt-2 font-display text-[22px] font-bold">
            {money(resumen.gastado)} <span className="text-txt-3">/ {money(resumen.limiteTotal)}</span>
          </div>
          <div className={cn('text-[12px] font-bold', resumen.libres >= 0 ? 'text-green' : 'text-negative')}>{resumen.libres >= 0 ? `${money(resumen.libres)} libres` : `${money(-resumen.libres)} por encima`}</div>
          {resumen.diasRestantes > 0 && <div className="mt-1 text-[12px] text-txt-2 dark:text-fg-2">Te quedan {money(resumen.porDia)}/día durante {resumen.diasRestantes} días</div>}
          <button type="button" disabled={pendiente} onClick={() => start(async () => { await reproponer(periodo, p.inicio); router.refresh(); })} className="mt-4 flex items-center gap-1.5 text-[11.5px] font-semibold text-txt-2 hover:text-green dark:text-fg-2">
            <RefreshCw size={13} className={cn(pendiente && 'animate-spin')} /> Volver a proponer con mis datos
          </button>
        </section>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-1">
          <div className="rounded-20 bg-ink p-4 text-white">
            <div className="flex items-center gap-1.5 text-[12px] font-semibold text-green-light"><ArrowDown size={14} /> Ingreso</div>
            <div className="mt-1 font-display text-[22px] font-bold">{money(resumen.ingreso)}</div>
            <div className="text-[11px] text-white/60">{periodo === 'q' ? 'por quincena' : periodo === 'mes' ? 'al mes' : 'al año'}</div>
          </div>
          <div className="rounded-20 bg-ink p-4 text-white">
            <div className="flex items-center gap-1.5 text-[12px] font-semibold text-green-light"><ArrowUp size={14} /> Gastado</div>
            <div className="mt-1 font-display text-[22px] font-bold">{money(resumen.gastado)}</div>
            <div className="text-[11px] text-white/60">{resumen.ingreso > 0 ? `${Math.round((resumen.gastado / resumen.ingreso) * 100)} % del ingreso` : ''}</div>
          </div>
        </div>
      </div>

      <TablaPresupuesto presupuestoId={p.id} lineas={resumen.lineas} />

      <ModalNuevoPresupuesto open={nuevo} onClose={() => setNuevo(false)} periodo={periodo} inicio={p.inicio} existentes={p.lineas.map((l) => l.categoriaId)} />
    </div>
  );
}
