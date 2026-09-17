'use client';

import { useMemo, useState } from 'react';
import { PieChart } from 'lucide-react';
import { deISO } from '@/lib/domain/fechas';
import { desplazar, enRango, mesDe, rangoPersonalizado, semanaDe, type Rango } from '@/lib/domain/quincena';
import type { Cuenta, Movimiento } from '@/lib/domain/tipos';
import { EmptyState } from '@/components/ui/EmptyState';
import { Historial } from '@/components/movimientos/Historial';
import { DetalleMovimiento } from '@/components/movimientos/DetalleMovimiento';
import { SelectorPeriodo, type ModoPeriodo } from './SelectorPeriodo';
import { BarrasMes } from './BarrasMes';
import { CuentasCirculares } from './CuentasCirculares';
import { TopGastos } from './TopGastos';
import { AgregarEfectivo } from './AgregarEfectivo';
import { DetalleCategoria } from './DetalleCategoria';

type Props = { cuentas: Cuenta[]; movimientos: Movimiento[]; hoy: string; cuentaInicial?: string; categoriaInicial?: string; busquedaInicial?: string };

export function Gastos({ cuentas, movimientos, hoy, cuentaInicial, categoriaInicial }: Props) {
  const h = deISO(hoy);
  const [modo, setModo] = useState<ModoPeriodo>('mes');
  const [rango, setRango] = useState<Rango>(() => mesDe(h));
  const [cuentaId, setCuentaId] = useState<string | null>(cuentaInicial && cuentas.some((c) => c.id === cuentaInicial) ? cuentaInicial : null);
  const [categoriaSel, setCategoriaSel] = useState<string | null>(categoriaInicial ?? null);
  const [movSel, setMovSel] = useState<Movimiento | null>(null);

  const cambiarModo = (m: ModoPeriodo) => {
    setModo(m);
    if (m === 'semana') setRango(semanaDe(h));
    else if (m === 'mes') setRango(mesDe(h));
    else setRango(rangoPersonalizado(rango.inicio, rango.fin));
  };

  const enPeriodo = useMemo(() => movimientos.filter((m) => enRango(m.fecha, rango) && (!cuentaId || m.cuentaId === cuentaId)), [movimientos, rango, cuentaId]);
  const anterior = useMemo(() => {
    const r = desplazar(rango, -1);
    return movimientos.filter((m) => enRango(m.fecha, r) && (!cuentaId || m.cuentaId === cuentaId));
  }, [movimientos, rango, cuentaId]);

  if (!cuentas.length) {
    return <EmptyState icon={PieChart} titulo="Sin movimientos todavía" texto="Cuando conectes una cuenta o subas un estado de cuenta, aquí verás tu gasto por periodo y categoría." cta={{ label: 'Subir estado de cuenta', href: '/app/importar' }} />;
  }

  return (
    <div className="mx-auto max-w-[760px] space-y-5">
      <SelectorPeriodo modo={modo} onModo={cambiarModo} rango={rango} onRango={setRango} />
      <BarrasMes movimientos={movimientos} cuentaId={cuentaId} rango={rango} hoy={hoy} onElegirMes={(r) => { setModo('mes'); setRango(r); }} />
      <CuentasCirculares cuentas={cuentas} movimientos={enPeriodo} seleccion={cuentaId} onSeleccion={setCuentaId} />
      <AgregarEfectivo />
      <TopGastos movimientos={enPeriodo} anteriores={anterior} rango={rango} onCategoria={setCategoriaSel} />
      <Historial movimientos={enPeriodo} cuentas={cuentas} hoy={hoy} onSeleccionar={setMovSel} inicial={8} />

      <DetalleCategoria categoriaId={categoriaSel} movimientos={enPeriodo} cuentas={cuentas} rango={rango} onClose={() => setCategoriaSel(null)} onSeleccionar={setMovSel} />
      <DetalleMovimiento movimiento={movSel} cuentas={cuentas} onClose={() => setMovSel(null)} />
    </div>
  );
}
