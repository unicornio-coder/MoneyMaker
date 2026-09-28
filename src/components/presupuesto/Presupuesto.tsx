'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { FileSpreadsheet, Plus, RefreshCw, Wallet } from 'lucide-react';
import { cn } from '@/lib/cn';
import { money } from '@/lib/format';
import { deISO } from '@/lib/domain/fechas';
import { quincenaDe, mesDe, anioDe, rangoDe, type Rango } from '@/lib/domain/quincena';
import { presupuestoVsActual } from '@/lib/domain/presupuesto';
import type { Cuenta, Movimiento, Periodo, Presupuesto as PresupuestoT } from '@/lib/domain/tipos';
import { useUI } from '@/lib/store/ui';
import { Chip, ChipGroup } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { Money } from '@/components/ui/Money';
import { TEXTOS } from '@/lib/textos';
import { TablaPresupuesto } from './TablaPresupuesto';
import { ModalNuevoPresupuesto } from './ModalNuevoPresupuesto';
import { SubirExcel } from './SubirExcel';
import { reproponer } from '@/app/app/presupuesto/acciones';

type Props = { presupuestos: Record<Periodo, PresupuestoT | null>; rangos: Record<Periodo, { inicio: string; fin: string; actual: boolean }>; movimientos: Movimiento[]; cuentas: Pick<Cuenta, 'id' | 'nombre'>[]; diasPago: number[]; hoy: string };

function rangoConEtiqueta(periodo: Periodo, inicio: string, diasPago: number[]): Rango {
  const d = deISO(inicio);
  return periodo === 'q' ? quincenaDe(d, diasPago) : periodo === 'mes' ? mesDe(d) : anioDe(d);
}

/** Presupuesto: un bloque arriba (gastado de límite, te quedan), filtro por cuenta y la lista por categoría con icono. */
export function Presupuesto({ presupuestos, rangos, movimientos, cuentas, diasPago, hoy }: Props) {
  const periodo = useUI((s) => s.periodo);
  const setPeriodo = useUI((s) => s.setPeriodo);
  const [nuevo, setNuevo] = useState(false);
  const [excel, setExcel] = useState(false);
  const [cuentaId, setCuentaId] = useState<string | null>(null);
  const [pendiente, start] = useTransition();
  const router = useRouter();
  const h = deISO(hoy);
  const r = rangos[periodo];
  const rango = useMemo(() => (r.actual ? rangoDe(periodo, h, diasPago) : rangoConEtiqueta(periodo, r.inicio, diasPago)), [periodo, h, diasPago, r]);
  const p = presupuestos[periodo];
  const movs = useMemo(() => (cuentaId ? movimientos.filter((m) => m.cuentaId === cuentaId) : movimientos), [movimientos, cuentaId]);
  const resumen = useMemo(() => (p ? presupuestoVsActual(p.lineas, movs, rango, p.ingreso, h) : null), [p, movs, rango, h]);

  if (!p || !resumen) {
    return <EmptyState icon={Wallet} titulo={TEXTOS.vacios.presupuesto.titulo} texto={TEXTOS.vacios.presupuesto.texto} cta={{ label: TEXTOS.vacios.presupuesto.cta, href: '/app/importar' }} />;
  }

  const pct = Math.min(100, resumen.pctGastado);
  const excedido = resumen.libres < 0;

  return (
    <div className="mx-auto max-w-[760px] space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ChipGroup label="Periodo" value={periodo} onChange={setPeriodo} options={[{ value: 'q', label: 'Quincena' }, { value: 'mes', label: 'Mes' }, { value: 'anio', label: 'Año' }]} size="sm" className="md:hidden" />
        <div className="hidden font-display text-[17px] font-bold md:block">{rango.etiqueta[0].toUpperCase() + rango.etiqueta.slice(1)}</div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setExcel(true)} className="flex h-9 items-center gap-1.5 rounded-pill border border-line-2 px-3.5 text-[12px] font-semibold hover:bg-bg-hover dark:border-edge dark:hover:bg-surface-2"><FileSpreadsheet size={14} /> Subir mi Excel</button>
          <button type="button" onClick={() => setNuevo(true)} className="btn-primary flex h-9 items-center gap-1.5 px-3.5 text-[12px]"><Plus size={15} /> Categoría</button>
        </div>
      </div>

      <section className="rounded-card-xl bg-ink p-5 text-white shadow-dark dark:bg-surface-2 dark:ring-1 dark:ring-white/10">
        <div className="flex items-baseline justify-between gap-3">
          <div className="text-[12.5px] font-semibold text-white/70">Gastado · {rango.etiqueta}{!r.actual ? ' (último periodo con datos)' : ''}</div>
          <div className="text-[12px] text-white/60">de {money(resumen.limiteTotal)}</div>
        </div>
        <Money value={resumen.gastado} animate className="mt-1 block text-[38px] font-bold leading-none tracking-[-1.6px] text-white" />
        <div className="mt-4 h-2 w-full rounded-pill bg-white/15">
          <div className={cn('h-2 rounded-pill transition-[width] duration-[600ms] ease-bounce', excedido ? 'bg-white' : 'bg-green-light')} style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-2 flex items-center justify-between text-[12.5px]">
          <span className={cn('font-bold', excedido ? 'text-white' : 'text-green-light')}>{excedido ? `${money(-resumen.libres)} por encima` : `Te quedan ${money(resumen.libres)}`}</span>
          <span className="text-white/60">{resumen.diasRestantes > 0 ? `${money(resumen.porDia)} al día · ${resumen.diasRestantes} días` : `${Math.round(resumen.pctGastado)} %`}</span>
        </div>
        {cuentas.length > 1 && (
          <div className="-mx-1 mt-4 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
            <Chip active={!cuentaId} onClick={() => setCuentaId(null)} size="sm" className={!cuentaId ? '' : 'border-white/25 bg-transparent text-white hover:bg-white/10'}>Todas las cuentas</Chip>
            {cuentas.map((c) => (
              <Chip key={c.id} active={cuentaId === c.id} onClick={() => setCuentaId(cuentaId === c.id ? null : c.id)} size="sm" className={cuentaId === c.id ? '' : 'border-white/25 bg-transparent text-white hover:bg-white/10'}>{c.nombre}</Chip>
            ))}
          </div>
        )}
      </section>

      <TablaPresupuesto presupuestoId={p.id} lineas={resumen.lineas} />

      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[11.5px] text-txt-3">
        <span>Ingreso del periodo: {money(resumen.ingreso)}. Edita un monto y presiona Enter.</span>
        {r.actual && (
          <button type="button" disabled={pendiente} onClick={() => start(async () => { await reproponer(periodo, p.inicio); router.refresh(); })} className="flex items-center gap-1.5 font-semibold text-txt-2 hover:text-green dark:text-fg-2">
            <RefreshCw size={12} className={cn(pendiente && 'animate-spin')} /> Volver a proponer con mis datos
          </button>
        )}
      </div>

      <ModalNuevoPresupuesto open={nuevo} onClose={() => setNuevo(false)} periodo={periodo} inicio={p.inicio} existentes={p.lineas.map((l) => l.categoriaId)} />
      <SubirExcel open={excel} onClose={() => setExcel(false)} periodo={periodo} inicio={p.inicio} />
    </div>
  );
}
