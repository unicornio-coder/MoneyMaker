'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/cn';
import type { TipoRecurrente, Frecuencia } from '@/lib/domain/tipos';
import { Panel } from '@/components/ui/Panel';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { crearRecurrente } from '@/app/app/fijos/acciones';
import type { CuentaResumen } from './Fijos';

const TIPOS: { id: TipoRecurrente; label: string }[] = [
  { id: 'suscripcion', label: 'Suscripción' },
  { id: 'servicio', label: 'Servicio' },
  { id: 'msi', label: 'Meses sin intereses' },
  { id: 'colegiatura', label: 'Colegiatura' },
  { id: 'otro', label: 'Otro' },
];

export function ModalNuevoRecurrente({ open, onClose, cuentas }: { open: boolean; onClose: () => void; cuentas: CuentaResumen[] }) {
  const [nombre, setNombre] = useState('');
  const [monto, setMonto] = useState('');
  const [dia, setDia] = useState('1');
  const [tipo, setTipo] = useState<TipoRecurrente>('suscripcion');
  const [frecuencia, setFrecuencia] = useState<Frecuencia>('mensual');
  const [cuentaId, setCuentaId] = useState('');
  const [cuotas, setCuotas] = useState('12');
  const [pagadas, setPagadas] = useState('1');
  const [error, setError] = useState<string | null>(null);
  const [pendiente, start] = useTransition();
  const router = useRouter();

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const r = await crearRecurrente({ nombre, monto: Number(monto), diaCobro: Number(dia), tipo, frecuencia, cuentaId: cuentaId || null, msiCuotasTotal: Number(cuotas) || null, msiCuotasPagadas: Number(pagadas) || null });
      if (!r.ok) setError(r.error);
      else {
        setNombre('');
        setMonto('');
        onClose();
        router.refresh();
      }
    });
  };

  return (
    <Panel open={open} onClose={onClose} mode="modal" title="Nuevo recurrente">
      <form onSubmit={enviar} className="space-y-3.5 pb-2">
        <div className="flex flex-wrap gap-1.5">
          {TIPOS.map((t) => (
            <button key={t.id} type="button" onClick={() => setTipo(t.id)} className={cn('rounded-pill border px-3 py-1.5 text-[12px] font-semibold', tipo === t.id ? 'border-ink bg-ink text-white dark:border-white dark:bg-white dark:text-ink' : 'border-line-2 dark:border-edge')}>{t.label}</button>
          ))}
        </div>
        <Input label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder={tipo === 'msi' ? 'Liverpool · pantalla' : 'Netflix, CFE, renta…'} required />
        <div className="grid grid-cols-2 gap-3">
          <Input label={tipo === 'msi' ? 'Cuota mensual' : 'Monto'} value={monto} onChange={(e) => setMonto(e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal" placeholder="219" required />
          <Input label="Día de cobro" type="number" min={1} max={31} value={dia} onChange={(e) => setDia(e.target.value)} required />
        </div>
        {tipo === 'msi' ? (
          <div className="grid grid-cols-2 gap-3">
            <Input label="Cuotas totales" type="number" min={2} max={48} value={cuotas} onChange={(e) => setCuotas(e.target.value)} />
            <Input label="Cuotas pagadas" type="number" min={0} max={48} value={pagadas} onChange={(e) => setPagadas(e.target.value)} />
          </div>
        ) : (
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-semibold">Frecuencia</span>
            <select value={frecuencia} onChange={(e) => setFrecuencia(e.target.value as Frecuencia)} className="input text-[13.5px]">
              <option value="mensual">Mensual</option>
              <option value="quincenal">Quincenal</option>
              <option value="semanal">Semanal</option>
              <option value="anual">Anual</option>
            </select>
          </label>
        )}
        <label className="block">
          <span className="mb-1.5 block text-[12.5px] font-semibold">Se cobra en</span>
          <select value={cuentaId} onChange={(e) => setCuentaId(e.target.value)} className="input text-[13.5px]">
            <option value="">Sin especificar</option>
            {cuentas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </label>
        {error && <p className="text-[12.5px] font-semibold text-negative">{error}</p>}
        <Button type="submit" variant="green" size="lg" full disabled={pendiente}>{pendiente ? 'Guardando…' : 'Agregar'}</Button>
      </form>
    </Panel>
  );
}
