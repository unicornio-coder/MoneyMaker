'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { PiggyBank, CreditCard, TrendingUp, Check, Plus, Trash2, Flag } from 'lucide-react';
import { cn } from '@/lib/cn';
import { money, fechaCorta } from '@/lib/format';
import type { Objetivo } from '@/lib/domain/tipos';
import { Panel } from '@/components/ui/Panel';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { abonarObjetivo, completarObjetivo, eliminarObjetivo, guardarObjetivo } from '@/app/app/objetivos/acciones';

const GRUPOS: { id: Objetivo['grupo']; label: string; icon: typeof PiggyBank; bg: string }[] = [
  { id: 'ahorro', label: 'Ahorro', icon: PiggyBank, bg: 'bg-green-50 text-green-dark dark:text-green-light' },
  { id: 'deuda', label: 'Deuda', icon: CreditCard, bg: 'bg-negative-50 text-negative' },
  { id: 'inversion', label: 'Inversión', icon: TrendingUp, bg: 'bg-invest-soft text-invest' },
];

export function Objetivos({ objetivos, cuentas }: { objetivos: Objetivo[]; cuentas: { id: string; nombre: string }[] }) {
  const [nuevo, setNuevo] = useState(false);
  const [sel, setSel] = useState<Objetivo | null>(null);
  const [pendiente, start] = useTransition();
  const router = useRouter();

  const toggle = (o: Objetivo) => start(async () => { await completarObjetivo(o.id, !o.completado); router.refresh(); });

  return (
    <div className="mx-auto max-w-[720px] space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-txt-2 dark:text-fg-2">{objetivos.filter((o) => o.completado).length} de {objetivos.length} completados</p>
        <button type="button" onClick={() => setNuevo(true)} className="btn-primary flex h-9 items-center gap-1.5 px-4 text-[12px]"><Plus size={15} /> Nuevo objetivo</button>
      </div>
      {objetivos.length === 0 && <EmptyState icon={Flag} titulo="Sin objetivos todavía" texto="Crea un objetivo de ahorro, deuda o inversión y sigue tu avance cada quincena." cta={{ label: 'Nuevo objetivo', onClick: () => setNuevo(true) }} />}
      {GRUPOS.map((g) => {
        const lista = objetivos.filter((o) => o.grupo === g.id);
        if (!lista.length) return null;
        const Icon = g.icon;
        return (
          <section key={g.id}>
            <div className="mb-2 flex items-center gap-2 text-[13px] font-bold"><span className={cn('flex h-[26px] w-[26px] items-center justify-center rounded-[8px]', g.bg)}><Icon size={15} /></span>{g.label}</div>
            <ul className="overflow-hidden rounded-16 bg-ink text-white shadow-dark">
              {lista.map((o) => {
                const p = Math.min(100, (o.avance / o.meta) * 100);
                return (
                  <li key={o.id} className="flex items-center gap-3 border-b border-white/10 px-4 py-3.5 last:border-b-0">
                    <button type="button" aria-label={o.completado ? 'Marcar pendiente' : 'Marcar completado'} disabled={pendiente} onClick={() => toggle(o)} className={cn('flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full border-2 transition-colors', o.completado ? 'border-green-light bg-green-light text-ink' : 'border-white/30 hover:border-green-light')}>
                      {o.completado && <Check size={14} strokeWidth={3} />}
                    </button>
                    <button type="button" onClick={() => setSel(o)} className="min-w-0 flex-1 text-left">
                      <div className="flex items-baseline justify-between gap-2"><span className={cn('truncate text-[13.5px] font-bold', o.completado && 'line-through opacity-70')}>{o.nombre}</span><span className="flex-none text-[11px] text-white/60">{o.fecha ? fechaCorta(o.fecha) : ''}</span></div>
                      <div className="mt-1.5 h-1 w-full rounded-pill bg-white/12"><div className="h-1 rounded-pill bg-green-light transition-[width] duration-[550ms] ease-bounce" style={{ width: `${p}%` }} /></div>
                      <div className="mt-1 text-[11px] text-white/70">{money(o.avance)} / {money(o.meta)} · {Math.round(p)} %</div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      <ModalObjetivo open={nuevo || !!sel} objetivo={sel} cuentas={cuentas} onClose={() => { setNuevo(false); setSel(null); }} />
    </div>
  );
}

function ModalObjetivo({ open, objetivo, cuentas, onClose }: { open: boolean; objetivo: Objetivo | null; cuentas: { id: string; nombre: string }[]; onClose: () => void }) {
  const [grupo, setGrupo] = useState<Objetivo['grupo']>(objetivo?.grupo ?? 'ahorro');
  const [nombre, setNombre] = useState(objetivo?.nombre ?? '');
  const [meta, setMeta] = useState(objetivo ? String(objetivo.meta) : '');
  const [fecha, setFecha] = useState(objetivo?.fecha ?? '');
  const [cuentaId, setCuentaId] = useState(objetivo?.cuentaId ?? '');
  const [abono, setAbono] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pendiente, start] = useTransition();
  const router = useRouter();
  const key = objetivo?.id ?? 'nuevo';

  const guardar = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const r = await guardarObjetivo({ id: objetivo?.id, grupo, nombre, meta: Number(meta), fecha: fecha || null, cuentaId: cuentaId || null });
      if (!r.ok) return setError(r.error);
      if (objetivo && Number(abono) > 0) await abonarObjetivo(objetivo.id, Number(abono));
      onClose();
      router.refresh();
    });
  };

  return (
    <Panel key={key} open={open} onClose={onClose} mode="modal" title={objetivo ? 'Editar objetivo' : 'Nuevo objetivo'}>
      <form onSubmit={guardar} className="space-y-3.5 pb-2">
        <div className="flex gap-1.5">
          {GRUPOS.map((g) => <button key={g.id} type="button" onClick={() => setGrupo(g.id)} className={cn('rounded-pill border px-3 py-1.5 text-[12px] font-semibold', grupo === g.id ? 'border-ink bg-ink text-white dark:border-white dark:bg-white dark:text-ink' : 'border-line-2 dark:border-edge')}>{g.label}</button>)}
        </div>
        <Input label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Fondo de emergencia" required />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Meta" value={meta} onChange={(e) => setMeta(e.target.value.replace(/[^\d]/g, ''))} inputMode="numeric" placeholder="90000" required />
          <Input label="Fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>
        <label className="block"><span className="mb-1.5 block text-[12.5px] font-semibold">Cuenta vinculada</span>
          <select value={cuentaId} onChange={(e) => setCuentaId(e.target.value)} className="input text-[13.5px]"><option value="">Ninguna</option>{cuentas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select>
        </label>
        {objetivo && <Input label="Abonar ahora (opcional)" value={abono} onChange={(e) => setAbono(e.target.value.replace(/[^\d]/g, ''))} inputMode="numeric" placeholder="1500" hint={`Llevas ${money(objetivo.avance)} de ${money(objetivo.meta)}`} />}
        {error && <p className="text-[12.5px] font-semibold text-negative">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" variant="green" size="lg" className="flex-1" disabled={pendiente}>{pendiente ? 'Guardando…' : 'Guardar'}</Button>
          {objetivo && <Button type="button" variant="outline" size="lg" aria-label="Eliminar" disabled={pendiente} onClick={() => start(async () => { await eliminarObjetivo(objetivo.id); onClose(); router.refresh(); })}><Trash2 size={18} /></Button>}
        </div>
      </form>
    </Panel>
  );
}
