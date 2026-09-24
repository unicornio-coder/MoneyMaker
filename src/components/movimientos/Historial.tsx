'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/cn';
import { detalleBasico } from '@/lib/domain/texto';
import { fechaRelativa } from '@/lib/format';
import { deISO } from '@/lib/domain/fechas';
import { categoria, etiquetaTipo } from '@/lib/domain/categorias';
import type { Cuenta, Movimiento } from '@/lib/domain/tipos';
import { Chip } from '@/components/ui/Chip';
import { Avatar } from '@/components/ui/Avatar';
import { Money } from '@/components/ui/Money';

type Filtro = 'todos' | 'hoy' | 'ingresos' | 'pagos';
const FILTROS: { value: Filtro; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'hoy', label: 'Hoy' },
  { value: 'ingresos', label: 'Ingresos' },
  { value: 'pagos', label: 'Pagos' },
];

type Props = { movimientos: Movimiento[]; cuentas: Pick<Cuenta, 'id' | 'nombre'>[]; hoy: string; titulo?: string; onSeleccionar?: (m: Movimiento) => void; inicial?: number };

export function Historial({ movimientos, cuentas, hoy, titulo = 'Historial de movimientos', onSeleccionar, inicial = 5 }: Props) {
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [todos, setTodos] = useState(false);
  const nombreCuenta = useMemo(() => new Map(cuentas.map((c) => [c.id, c.nombre])), [cuentas]);

  const lista = useMemo(() => {
    const h = deISO(hoy);
    const q = busqueda.trim().toLowerCase();
    return movimientos.filter((m) => {
      if (filtro === 'hoy' && m.fecha !== hoy) return false;
      if (filtro === 'ingresos' && m.tipo !== 'ingreso') return false;
      if (filtro === 'pagos' && m.tipo !== 'pago_tarjeta') return false;
      if (q) {
        const texto = `${m.comercio} ${m.descripcionRaw} ${m.detalle ?? ''} ${m.nota ?? ''} ${categoria(m.categoriaId).nombre}`.toLowerCase().includes(q);
        const monto = /^\$?[\d.,]+$/.test(q) && String(Math.round(m.monto)).includes(q.replace(/[$,]/g, '').split('.')[0]);
        if (!texto && !monto) return false;
      }
      return true;
    });
  }, [movimientos, filtro, busqueda, hoy]);

  const visibles = todos ? lista : lista.slice(0, inicial);
  const grupos: { etiqueta: string; items: Movimiento[] }[] = [];
  for (const m of visibles) {
    const etiqueta = fechaRelativa(m.fecha, deISO(hoy));
    const g = grupos[grupos.length - 1];
    if (g && g.etiqueta === etiqueta) g.items.push(m);
    else grupos.push({ etiqueta, items: [m] });
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-[38px]" />
        <h2 className="flex-1 text-center font-display text-[16px] font-bold">{titulo}</h2>
        <button type="button" aria-label="Buscar" onClick={() => setBuscando((v) => !v)} className={cn('flex h-[38px] w-[38px] items-center justify-center rounded-full bg-bg-muted dark:bg-surface-2', buscando && 'bg-ink text-white dark:bg-white dark:text-ink')}>
          <Search size={17} />
        </button>
      </div>
      {buscando && <input autoFocus value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar comercio o categoría" className="input text-[13px]" />}
      <div className="-mx-3.5 flex gap-1.5 overflow-x-auto px-3.5 md:mx-0 md:px-0">
        {FILTROS.map((f) => (
          <Chip key={f.value} active={filtro === f.value} onClick={() => setFiltro(f.value)} tone="lime">
            {f.label}
          </Chip>
        ))}
      </div>

      {grupos.length === 0 ? (
        <p className="py-8 text-center text-[12.5px] text-txt-2">No hay movimientos con ese filtro.</p>
      ) : (
        grupos.map((g) => (
          <div key={g.etiqueta}>
            <div className="mb-1 flex items-center gap-2">
              <span className="section-label">{g.etiqueta}</span>
              <span className="h-px flex-1 bg-edge" />
            </div>
            <ul>
              {g.items.map((m, i) => (
                <li key={m.id} className={cn(i < 8 && 'animate-rise')} style={i < 8 ? { animationDelay: `${i * 45}ms` } : undefined}>
                  <button type="button" onClick={() => onSeleccionar?.(m)} className="flex h-[66px] w-full items-center gap-3 rounded-card px-1.5 text-left transition-colors hover:bg-bg-hover dark:hover:bg-surface-2">
                    <Avatar domain={m.comercioDominio} nombre={m.comercio} size={46} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px] font-bold">{m.comercio}</div>
                      <div className="truncate text-[11.5px] text-txt-2 dark:text-fg-2">{m.detalle ? <><span className="text-fg dark:text-white">{m.detalle}</span> · </> : `${detalleBasico(m.descripcionRaw) ?? categoria(m.categoriaId).nombre} · `}{nombreCuenta.get(m.cuentaId) ?? 'Cuenta'}</div>
                    </div>
                    <div className="text-right">
                      <Money value={m.monto} tone={m.tipo === 'ingreso' ? 'green' : 'inherit'} signed={m.tipo === 'ingreso'} className="block text-[15px] font-bold" />
                      <div className="text-[11.5px] text-txt-2 dark:text-fg-2">{etiquetaTipo(m.tipo, m.esMsi)}</div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
      {!todos && lista.length > inicial && (
        <button type="button" onClick={() => setTodos(true)} className="h-11 w-full rounded-card text-[13px] font-bold text-green-dark dark:text-green-light hover:bg-green-50 dark:hover:bg-surface-2">
          Ver todos ({lista.length})
        </button>
      )}
    </section>
  );
}
