'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Bell, Trash2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { money, mesLargo, diaCorto } from '@/lib/format';
import { aISO, deISO, sumarDias, sumarMeses, ultimoDiaDelMes } from '@/lib/domain/fechas';
import type { EventoCalendario, Recurrente } from '@/lib/domain/tipos';
import { Panel } from '@/components/ui/Panel';
import { Avatar } from '@/components/ui/Avatar';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { crearEvento, eliminarEvento } from '@/app/app/fijos/acciones';
import type { CuentaResumen } from './Fijos';

type Item = { id: string; nombre: string; monto: number | null; dominio: string | null; tipo: 'recurrente' | 'evento'; recurrenteId?: string | null; eventoTipo?: EventoCalendario['tipo'] };

type Props = { recurrentes: Recurrente[]; eventos: EventoCalendario[]; cuentas: CuentaResumen[]; hoy: string; onAbrir: (id: string) => void; pagoCuentaId?: string };

export function Calendario({ recurrentes, eventos, cuentas, hoy, onAbrir, pagoCuentaId }: Props) {
  const h = deISO(hoy);
  const [inicioSemana, setInicioSemana] = useState(() => sumarDias(h, -((h.getDay() + 6) % 7)));
  const [diaSel, setDiaSel] = useState<string | null>(null);
  const [formAbierto, setFormAbierto] = useState(!!pagoCuentaId);
  const cuentaPago = cuentas.find((c) => c.id === pagoCuentaId);
  const [nombre, setNombre] = useState(cuentaPago ? `Pagar ${cuentaPago.nombre}` : '');
  const [monto, setMonto] = useState(cuentaPago ? String(Math.round(cuentaPago.saldo)) : '');
  const [fecha, setFecha] = useState(cuentaPago?.fechaLimite ?? hoy);
  const [pendiente, start] = useTransition();
  const router = useRouter();

  const dias = useMemo(() => Array.from({ length: 7 }, (_, i) => sumarDias(inicioSemana, i)), [inicioSemana]);

  const itemsDe = (d: Date): Item[] => {
    const iso = aISO(d);
    const out: Item[] = [];
    for (const r of recurrentes) {
      const dia = Math.min(r.diaCobro ?? 0, ultimoDiaDelMes(d));
      if (r.frecuencia === 'mensual' && dia === d.getDate()) out.push({ id: `r-${r.id}`, nombre: r.nombre, monto: r.monto, dominio: r.comercioDominio ?? null, tipo: 'recurrente', recurrenteId: r.id });
      if (r.frecuencia === 'anual' && dia === d.getDate() && r.ultimoCargo && deISO(r.ultimoCargo).getMonth() === d.getMonth()) out.push({ id: `r-${r.id}`, nombre: r.nombre, monto: r.monto, dominio: r.comercioDominio ?? null, tipo: 'recurrente', recurrenteId: r.id });
    }
    for (const e of eventos) if (e.fecha === iso) out.push({ id: `e-${e.id}`, nombre: e.nombre, monto: e.monto ?? null, dominio: null, tipo: 'evento', recurrenteId: e.recurrenteId, eventoTipo: e.tipo });
    return out;
  };

  const guardar = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const r = await crearEvento({ fecha, nombre, monto: monto ? Number(monto) : null, tipo: 'pago' });
      if (r.ok) {
        setFormAbierto(false);
        setNombre('');
        setMonto('');
        router.refresh();
      }
    });
  };

  const mesTitulo = mesLargo(dias[3]);
  const seleccion = diaSel ? itemsDe(deISO(diaSel)) : [];

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="mb-3 flex items-center justify-between">
          <button type="button" aria-label="Semana anterior" onClick={() => setInicioSemana((d) => sumarDias(d, -7))} className="flex h-8 w-8 items-center justify-center rounded-full bg-bg-muted dark:bg-surface-2"><ChevronLeft size={17} /></button>
          <div className="flex items-center gap-2 font-display text-[15px] font-bold">
            {mesTitulo}
            <button type="button" aria-label="Calendarizar un pago" onClick={() => setFormAbierto((v) => !v)} className="flex h-7 w-7 items-center justify-center rounded-full bg-green text-white"><Bell size={14} /></button>
          </div>
          <button type="button" aria-label="Semana siguiente" onClick={() => setInicioSemana((d) => sumarDias(d, 7))} className="flex h-8 w-8 items-center justify-center rounded-full bg-bg-muted dark:bg-surface-2"><ChevronRight size={17} /></button>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {dias.map((d) => {
            const iso = aISO(d);
            const esHoy = iso === hoy;
            const items = itemsDe(d);
            const total = items.reduce((s, i) => s + (i.monto ?? 0), 0);
            return (
              <button key={iso} type="button" onClick={() => setDiaSel(iso)} className="flex flex-col items-center gap-1.5">
                <span className="text-[10.5px] font-semibold uppercase text-txt-2 dark:text-fg-2">{diaCorto(d)}</span>
                <span className={cn('relative flex h-9 w-9 items-center justify-center rounded-full font-display text-[13.5px] font-bold transition-transform hover:scale-105', esHoy ? 'bg-green-light text-ink' : 'bg-ink text-white dark:bg-white dark:text-ink')}>
                  {d.getDate()}
                  {items.length > 0 && <span className={cn('absolute -bottom-0.5 h-1.5 w-1.5 rounded-full', esHoy ? 'bg-ink' : 'bg-green-light dark:bg-green')} />}
                </span>
                <span className="h-4 text-[10px] font-semibold text-txt-2 dark:text-fg-2">{total > 0 ? money(total) : ''}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex justify-end text-[11px]">
          <button type="button" onClick={() => setInicioSemana(sumarDias(h, -((h.getDay() + 6) % 7)))} className="font-semibold text-green-dark dark:text-green-light">Hoy</button>
        </div>
      </div>

      {formAbierto && (
        <form onSubmit={guardar} className="card animate-screen space-y-3 border-2 border-green p-4">
          <div className="font-display text-[15px] font-bold">Calendarizar un pago</div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Input label="Concepto" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Pagar tarjeta Nu" required />
            <Input label="Monto" value={monto} onChange={(e) => setMonto(e.target.value.replace(/[^\d.]/g, ''))} placeholder="6480" inputMode="decimal" />
            <Input label="Fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
          </div>
          <div className="flex gap-2">
            <Button variant="green" disabled={pendiente || !nombre.trim()} type="submit">{pendiente ? 'Guardando…' : 'Guardar en calendario'}</Button>
            <Button variant="ghost" onClick={() => setFormAbierto(false)}>Cancelar</Button>
          </div>
        </form>
      )}

      <div className="text-[12px] text-txt-2 dark:text-fg-2">
        Próximo mes: {money(recurrentes.reduce((s, r) => s + (r.frecuencia === 'mensual' ? r.monto : 0), 0))} en cargos fijos · {mesLargo(sumarMeses(h, 1))}
      </div>

      <Panel open={!!diaSel} onClose={() => setDiaSel(null)} mode="sheet" title={diaSel ? `${deISO(diaSel).getDate()} de ${mesLargo(deISO(diaSel)).toLowerCase()}` : ''}>
        {seleccion.length === 0 ? (
          <p className="py-8 text-center text-[12.5px] text-txt-2">Sin cargos ese día.</p>
        ) : (
          <ul className="divide-y divide-edge pb-3">
            {seleccion.map((i) => (
              <li key={i.id} className="flex h-16 items-center gap-3">
                <Avatar domain={i.dominio} nombre={i.nombre} size={44} />
                <button type="button" onClick={() => i.recurrenteId && onAbrir(i.recurrenteId)} className="min-w-0 flex-1 text-left">
                  <div className="truncate text-[13.5px] font-bold">{i.nombre}</div>
                  <div className="text-[11px] text-txt-2 dark:text-fg-2">{i.tipo === 'recurrente' ? 'Cargo fijo' : i.eventoTipo === 'recordatorio' ? 'Recordatorio' : 'Pago calendarizado'}</div>
                </button>
                {i.monto != null && <span className="font-display text-[14px] font-bold">{money(i.monto)}</span>}
                {i.tipo === 'evento' && (
                  <button type="button" aria-label="Quitar" onClick={() => start(async () => { await eliminarEvento(i.id.slice(2)); setDiaSel(null); router.refresh(); })} className="flex h-8 w-8 items-center justify-center rounded-full text-txt-3 hover:bg-bg-muted"><Trash2 size={15} /></button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
