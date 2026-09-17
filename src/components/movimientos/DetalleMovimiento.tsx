'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';
import { fechaCorta } from '@/lib/format';
import { CATEGORIAS, categoria, etiquetaTipo } from '@/lib/domain/categorias';
import type { Cuenta, Movimiento } from '@/lib/domain/tipos';
import { Panel } from '@/components/ui/Panel';
import { Avatar } from '@/components/ui/Avatar';
import { Money } from '@/components/ui/Money';
import { Button } from '@/components/ui/Button';
import { corregirCategoria } from '@/app/app/acciones';

type Props = { movimiento: Movimiento | null; cuentas: Pick<Cuenta, 'id' | 'nombre'>[]; onClose: () => void };

export function DetalleMovimiento({ movimiento, cuentas, onClose }: Props) {
  const [cat, setCat] = useState(movimiento?.categoriaId ?? 'otros');
  const [aTodos, setATodos] = useState(true);
  const [pendiente, start] = useTransition();
  const [guardado, setGuardado] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setCat(movimiento?.categoriaId ?? 'otros');
    setGuardado(false);
  }, [movimiento]);

  if (!movimiento) return null;
  const m = movimiento;
  const cuenta = cuentas.find((c) => c.id === m.cuentaId)?.nombre ?? 'Cuenta';
  const opciones = CATEGORIAS.filter((c) => (m.tipo === 'gasto' ? c.tipo === 'gasto' : c.tipo !== 'gasto'));
  const cambio = cat !== m.categoriaId;

  const guardar = () =>
    start(async () => {
      const r = await corregirCategoria(m.id, cat, aTodos);
      if (r.ok) {
        setGuardado(true);
        router.refresh();
        setTimeout(onClose, 500);
      }
    });

  return (
    <Panel open onClose={onClose} mode="sheet" title="Movimiento">
      <div className="space-y-4 pb-3">
        <div className="flex items-center gap-3">
          <Avatar domain={m.comercioDominio} nombre={m.comercio} size={52} />
          <div className="min-w-0 flex-1">
            <div className="truncate font-display text-[17px] font-bold">{m.comercio}</div>
            <div className="text-[12px] text-txt-2 dark:text-fg-2">{fechaCorta(m.fecha)} · {cuenta} · {etiquetaTipo(m.tipo, m.esMsi)}</div>
          </div>
          <Money value={m.monto} tone={m.tipo === 'ingreso' ? 'green' : 'inherit'} signed={m.tipo === 'ingreso'} className="text-[20px] font-bold" />
        </div>
        <div className="rounded-input bg-bg-page px-3 py-2 text-[11.5px] text-txt-2 dark:bg-surface-2 dark:text-fg-2">
          <span className="font-semibold text-fg">Como lo mandó el banco:</span> {m.descripcionRaw}
          {m.esMsi && m.msiCuota && <span className="ml-1 font-semibold text-invest">· cuota {m.msiCuota} de {m.msiTotal}</span>}
        </div>
        <div>
          <div className="mb-2 text-[12.5px] font-bold">Categoría</div>
          <div className="flex flex-wrap gap-1.5">
            {opciones.map((c) => (
              <button key={c.id} type="button" onClick={() => setCat(c.id)} className={cn('inline-flex items-center gap-1.5 rounded-pill border px-3 py-1.5 text-[12px] font-semibold transition-colors', cat === c.id ? 'border-ink bg-ink text-white dark:border-white dark:bg-white dark:text-ink' : 'border-line-2 bg-surface dark:border-edge')}>
                <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
                {c.nombre}
              </button>
            ))}
          </div>
        </div>
        {cambio && (
          <label className="flex items-center gap-2 text-[12.5px]">
            <input type="checkbox" checked={aTodos} onChange={(e) => setATodos(e.target.checked)} className="h-4 w-4 accent-green" />
            Aplicar a todos los movimientos de {m.comercio} (pasados y futuros)
          </label>
        )}
        <Button variant="green" size="lg" full disabled={!cambio || pendiente} onClick={guardar}>
          {guardado ? <><Check size={18} /> Guardado</> : pendiente ? 'Guardando…' : `Cambiar a ${categoria(cat).nombre}`}
        </Button>
      </div>
    </Panel>
  );
}
