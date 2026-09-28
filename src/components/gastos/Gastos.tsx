'use client';

import { useMemo, useState } from 'react';
import { PieChart, X } from 'lucide-react';
import { money } from '@/lib/format';
import { deISO } from '@/lib/domain/fechas';
import { desplazar, enRango, mesDe, rangoPersonalizado, semanaDe, diasDelRango, type Rango } from '@/lib/domain/quincena';
import { gastoPorCategoria, variacion } from '@/lib/domain/series';
import { categoria } from '@/lib/domain/categorias';
import type { Cuenta, Movimiento } from '@/lib/domain/tipos';
import { EmptyState } from '@/components/ui/EmptyState';
import { Chip } from '@/components/ui/Chip';
import { Money } from '@/components/ui/Money';
import { TEXTOS } from '@/lib/textos';
import { Historial } from '@/components/movimientos/Historial';
import { DetalleMovimiento } from '@/components/movimientos/DetalleMovimiento';
import { SelectorPeriodo, type ModoPeriodo } from './SelectorPeriodo';
import { TilesCategorias } from './TilesCategorias';
import { AgregarEfectivo } from './AgregarEfectivo';

type Props = { cuentas: Cuenta[]; movimientos: Movimiento[]; hoy: string; cuentaInicial?: string; categoriaInicial?: string; busquedaInicial?: string };

/** Gastos: periodo, total, categorías como tiles y la tabla de movimientos filtrada por categoría y cuenta. */
export function Gastos({ cuentas, movimientos, hoy, cuentaInicial, categoriaInicial }: Props) {
  const h = deISO(hoy);
  const [modo, setModo] = useState<ModoPeriodo>('mes');
  // Si el mes en curso no tiene gastos (p. ej. el último estado de cuenta cerró el mes pasado), abre en el último mes con datos.
  const [rango, setRango] = useState<Rango>(() => {
    const actual = mesDe(h);
    if (movimientos.some((m) => m.tipo === 'gasto' && enRango(m.fecha, actual))) return actual;
    const ultimo = movimientos.filter((m) => m.tipo === 'gasto').map((m) => m.fecha).sort().pop();
    return ultimo ? mesDe(deISO(ultimo)) : actual;
  });
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
  const gastos = enPeriodo.filter((m) => m.tipo === 'gasto');
  const total = gastos.reduce((s, m) => s + m.monto, 0);
  const totalAnterior = anterior.filter((m) => m.tipo === 'gasto').reduce((s, m) => s + m.monto, 0);
  const varTotal = variacion(total, totalAnterior);
  const porCategoria = useMemo(() => gastoPorCategoria(enPeriodo, rango), [enPeriodo, rango]);
  const tabla = useMemo(() => (categoriaSel ? enPeriodo.filter((m) => m.categoriaId === categoriaSel) : enPeriodo), [enPeriodo, categoriaSel]);
  const contexto = [`${money(total / Math.max(1, diasDelRango(rango)))} al día`, varTotal == null ? null : varTotal === 0 ? 'igual que el periodo anterior' : `${Math.abs(varTotal).toFixed(0)} % ${varTotal > 0 ? 'más' : 'menos'} que el anterior`].filter(Boolean).join(' · ');

  if (!cuentas.length) {
    return <EmptyState icon={PieChart} titulo={TEXTOS.vacios.gastos.titulo} texto={TEXTOS.vacios.gastos.texto} cta={{ label: TEXTOS.vacios.gastos.cta, href: '/app/importar' }} />;
  }

  return (
    <div className="mx-auto max-w-[760px] space-y-6">
      <SelectorPeriodo modo={modo} onModo={cambiarModo} rango={rango} onRango={setRango} />

      <section className="rounded-card-xl bg-ink p-5 text-white shadow-dark dark:bg-surface-2 dark:ring-1 dark:ring-white/10">
        <div className="text-[12.5px] font-semibold text-white/70">Gastaste · {rango.etiqueta}</div>
        <Money value={total} animate className="mt-1 block text-[38px] font-bold leading-none tracking-[-1.6px] text-white" />
        {gastos.length > 0 && <div className="mt-2 text-[12px] text-white/60">{contexto}</div>}
        {cuentas.length > 1 && (
          <div className="-mx-1 mt-4 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
            <Chip active={!cuentaId} onClick={() => setCuentaId(null)} size="sm" className={!cuentaId ? '' : 'border-white/25 bg-transparent text-white hover:bg-white/10'}>Todas las cuentas</Chip>
            {cuentas.map((c) => (
              <Chip key={c.id} active={cuentaId === c.id} onClick={() => setCuentaId(cuentaId === c.id ? null : c.id)} size="sm" className={cuentaId === c.id ? '' : 'border-white/25 bg-transparent text-white hover:bg-white/10'}>{c.nombre}</Chip>
            ))}
          </div>
        )}
      </section>

      <TilesCategorias porCategoria={porCategoria} total={total} seleccion={categoriaSel} onSeleccion={setCategoriaSel} />

      <div className="space-y-3">
        {categoriaSel && (
          <button type="button" onClick={() => setCategoriaSel(null)} className="inline-flex h-8 items-center gap-1.5 rounded-pill bg-ink px-3 text-[12px] font-bold text-white dark:bg-white dark:text-ink">
            {categoria(categoriaSel).nombre} <X size={13} />
          </button>
        )}
        <Historial movimientos={tabla} cuentas={cuentas} hoy={hoy} titulo="Movimientos" onSeleccionar={setMovSel} inicial={12} />
      </div>
      <AgregarEfectivo />

      <DetalleMovimiento movimiento={movSel} cuentas={cuentas} onClose={() => setMovSel(null)} />
    </div>
  );
}
