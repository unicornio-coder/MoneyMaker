'use client';

import { useMemo, useState } from 'react';
import { Repeat, Plus, CalendarDays, LayoutList } from 'lucide-react';
import { cn } from '@/lib/cn';
import { money } from '@/lib/format';
import { costoMensual } from '@/lib/domain/recurrentes';
import type { EventoCalendario, Recurrente } from '@/lib/domain/tipos';
import { EmptyState } from '@/components/ui/EmptyState';
import { TablasRecurrentes } from './TablasRecurrentes';
import { DrawerRecurrente } from './DrawerRecurrente';
import { Calendario } from './Calendario';
import { ModalNuevoRecurrente } from './ModalNuevoRecurrente';

export type CuentaResumen = { id: string; nombre: string; bancoDominio: string | null; fechaLimite: string | null; tipo: string; saldo: number };

type Props = {
  recurrentes: Recurrente[];
  eventos: EventoCalendario[];
  cuentas: CuentaResumen[];
  ingresoMensual: number;
  hoy: string;
  inicial: { recurrenteId?: string; seccion?: string; vista?: string; pagoCuentaId?: string };
};

export function Fijos({ recurrentes, eventos, cuentas, ingresoMensual, hoy, inicial }: Props) {
  const [vista, setVista] = useState<'tablas' | 'cal'>(inicial.vista === 'cal' ? 'cal' : 'tablas');
  const [sel, setSel] = useState<string | null>(inicial.recurrenteId ?? null);
  const [nuevo, setNuevo] = useState(false);
  const activos = useMemo(() => recurrentes.filter((r) => r.activo), [recurrentes]);
  const totales = useMemo(() => {
    const suma = (f: (r: Recurrente) => boolean) => activos.filter(f).reduce((s, r) => s + (r.tipo === 'msi' ? r.monto : costoMensual(r)), 0);
    return { total: suma(() => true), suscripciones: suma((r) => r.tipo === 'suscripcion'), servicios: suma((r) => r.tipo === 'servicio' || r.tipo === 'colegiatura' || r.tipo === 'otro'), msi: suma((r) => r.tipo === 'msi') };
  }, [activos]);
  const seleccionado = recurrentes.find((r) => r.id === sel) ?? null;

  if (!recurrentes.length) {
    return (
      <>
        <EmptyState icon={Repeat} titulo="Sin gastos fijos detectados" texto="Detectamos suscripciones, servicios y meses sin intereses a partir de tus movimientos. También puedes agregarlos a mano." cta={{ label: 'Nuevo recurrente', onClick: () => setNuevo(true) }} />
        <ModalNuevoRecurrente open={nuevo} onClose={() => setNuevo(false)} cuentas={cuentas} />
      </>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        {[['Total mensual', totales.total, true], ['Suscripciones', totales.suscripciones, false], ['Servicios', totales.servicios, false], ['Meses sin intereses', totales.msi, false]].map(([l, v, dark]) => (
          <div key={String(l)} className={cn('rounded-card px-3.5 py-3', dark ? 'bg-ink text-white' : 'card')}>
            <div className={cn('text-[11px] font-semibold', dark ? 'text-green-light' : 'text-txt-2 dark:text-fg-2')}>{l}</div>
            <div className="font-display text-[20px] font-bold tracking-[-0.5px]">{money(Number(v))}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1 rounded-pill bg-bg-muted p-1 dark:bg-surface-2">
          <button type="button" onClick={() => setVista('tablas')} className={cn('flex h-8 items-center gap-1.5 whitespace-nowrap rounded-pill px-3 text-[12px] font-semibold transition-colors', vista === 'tablas' ? 'bg-surface shadow-card' : 'text-txt-2 dark:text-fg-2')}><LayoutList size={14} /> Por categoría</button>
          <button type="button" onClick={() => setVista('cal')} className={cn('flex h-8 items-center gap-1.5 whitespace-nowrap rounded-pill px-3 text-[12px] font-semibold transition-colors', vista === 'cal' ? 'bg-surface shadow-card' : 'text-txt-2 dark:text-fg-2')}><CalendarDays size={14} /> Calendario</button>
        </div>
        <button type="button" onClick={() => setNuevo(true)} className="btn-primary flex h-9 items-center gap-1.5 whitespace-nowrap px-4 text-[12px]"><Plus size={15} /> Nuevo</button>
      </div>

      {vista === 'tablas' ? (
        <TablasRecurrentes recurrentes={activos} onAbrir={setSel} seccionInicial={inicial.seccion} />
      ) : (
        <Calendario recurrentes={activos} eventos={eventos} cuentas={cuentas} hoy={hoy} onAbrir={setSel} pagoCuentaId={inicial.pagoCuentaId} />
      )}

      <DrawerRecurrente recurrente={seleccionado} ingresoMensual={ingresoMensual} onClose={() => setSel(null)} />
      <ModalNuevoRecurrente open={nuevo} onClose={() => setNuevo(false)} cuentas={cuentas} />
    </div>
  );
}
