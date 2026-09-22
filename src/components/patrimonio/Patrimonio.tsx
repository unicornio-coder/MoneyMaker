'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, Plus, Trash2, Home, Car, TrendingUp, Bitcoin, Banknote, CreditCard, Landmark, Package } from 'lucide-react';
import { cn } from '@/lib/cn';
import { money } from '@/lib/format';
import type { Activo, Cuenta, Pasivo } from '@/lib/domain/tipos';
import { Panel } from '@/components/ui/Panel';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Money } from '@/components/ui/Money';
import { EmptyState } from '@/components/ui/EmptyState';
import { TEXTOS } from '@/lib/textos';
import { eliminarActivo, eliminarPasivo, guardarActivo, guardarPasivo } from '@/app/app/patrimonio/acciones';

type Vista = 'act' | 'pas';
type Rubro = { id: string; nombre: string; icon: typeof Home; monto: number; items: { id: string; nombre: string; monto: number; sub?: string; origen: 'activo' | 'pasivo' | 'cuenta' }[] };

const RUBROS_ACT: { id: Activo['tipo']; nombre: string; icon: typeof Home }[] = [
  { id: 'casa', nombre: 'Casa', icon: Home },
  { id: 'auto', nombre: 'Autos', icon: Car },
  { id: 'inversion', nombre: 'Inversiones', icon: TrendingUp },
  { id: 'cripto', nombre: 'Cripto', icon: Bitcoin },
  { id: 'efectivo', nombre: 'Efectivo y débito', icon: Banknote },
  { id: 'otro', nombre: 'Otros', icon: Package },
];
const RUBROS_PAS: { id: Pasivo['tipo']; nombre: string; icon: typeof Home }[] = [
  { id: 'tarjeta', nombre: 'Tarjetas', icon: CreditCard },
  { id: 'hipoteca', nombre: 'Hipoteca', icon: Landmark },
  { id: 'auto', nombre: 'Crédito de auto', icon: Car },
  { id: 'personal', nombre: 'Préstamos', icon: Banknote },
  { id: 'otro', nombre: 'Otros', icon: Package },
];

type PnL = { mes: string; ingresos: number; fijos: number; variables: number; ahorro: number; fijosEsperados: number };

export function Patrimonio({ activos, pasivos, cuentas, pnl }: { activos: Activo[]; pasivos: Pasivo[]; cuentas: Cuenta[]; pnl: PnL }) {
  const [vista, setVista] = useState<Vista>('act');
  const [rubroSel, setRubroSel] = useState<string | null>(null);
  const [agregar, setAgregar] = useState<Vista | null>(null);

  // Cuentas conectadas cuentan solas: débito/efectivo/inversión como activos, crédito como pasivo (evita duplicar con activos ligados a cuenta).
  const ligadas = useMemo(() => new Set([...activos, ...pasivos].map((x) => x.cuentaId).filter(Boolean)), [activos, pasivos]);
  const rubrosAct: Rubro[] = useMemo(
    () =>
      RUBROS_ACT.map((r) => {
        const items = activos.filter((a) => a.tipo === r.id).map((a) => ({ id: a.id, nombre: a.nombre, monto: a.valor, sub: a.tipo === 'auto' && a.detalle.depreciacionAnual ? `Deprecia ~${money(a.valor * Number(a.detalle.depreciacionAnual))}/año` : undefined, origen: 'activo' as const }));
        const desdeCuentas = cuentas.filter((c) => !ligadas.has(c.id) && ((r.id === 'efectivo' && (c.tipo === 'debito' || c.tipo === 'efectivo')) || (r.id === 'inversion' && c.tipo === 'inversion' && c.banco !== 'Bitso') || (r.id === 'cripto' && c.banco === 'Bitso'))).map((c) => ({ id: c.id, nombre: c.nombre, monto: c.saldo, sub: 'Cuenta conectada', origen: 'cuenta' as const }));
        const todos = [...items, ...desdeCuentas];
        return { ...r, monto: todos.reduce((s, i) => s + i.monto, 0), items: todos };
      }).filter((r) => r.items.length),
    [activos, cuentas, ligadas],
  );
  const rubrosPas: Rubro[] = useMemo(
    () =>
      RUBROS_PAS.map((r) => {
        const items = pasivos.filter((p) => p.tipo === r.id).map((p) => ({ id: p.id, nombre: p.nombre, monto: p.saldo, sub: p.tasa ? `Tasa ${p.tasa} %` : undefined, origen: 'pasivo' as const }));
        const desdeCuentas = r.id === 'tarjeta' ? cuentas.filter((c) => c.tipo === 'credito' && !ligadas.has(c.id)).map((c) => ({ id: c.id, nombre: c.nombre, monto: c.saldo, sub: 'Cuenta conectada', origen: 'cuenta' as const })) : [];
        const todos = [...items, ...desdeCuentas];
        return { ...r, monto: todos.reduce((s, i) => s + i.monto, 0), items: todos };
      }).filter((r) => r.items.length),
    [pasivos, cuentas, ligadas],
  );
  const totalAct = rubrosAct.reduce((s, r) => s + r.monto, 0);
  const totalPas = rubrosPas.reduce((s, r) => s + r.monto, 0);
  const neto = totalAct - totalPas;
  const rubros = vista === 'act' ? rubrosAct : rubrosPas;
  const total = vista === 'act' ? totalAct : totalPas;
  const rubro = rubros.find((r) => r.id === rubroSel) ?? null;
  const flujo = pnl.ingresos - pnl.fijos - pnl.variables - pnl.ahorro;

  if (!cuentas.length && !activos.length && !pasivos.length) {
    return (
      <div className="mx-auto max-w-[720px] space-y-4">
        <EmptyState icon={Landmark} titulo={TEXTOS.vacios.patrimonio.titulo} texto={TEXTOS.vacios.patrimonio.texto} cta={{ label: TEXTOS.vacios.patrimonio.cta, href: '/app/importar' }} />
        <div className="text-center">
          <button type="button" onClick={() => setAgregar('act')} className="text-[12.5px] font-bold text-green">O captura un activo o una deuda a mano</button>
        </div>
        <ModalAgregar tipo={agregar} onClose={() => setAgregar(null)} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[720px] space-y-6">
      <div className="text-center">
        <div className="text-[12.5px] text-txt-2 dark:text-fg-2">Patrimonio neto</div>
        <Money value={neto} className="block text-[44px] font-bold leading-none tracking-[-2px]" tone={neto >= 0 ? 'ink' : 'blue'} />
        <div className="mt-1.5 text-[11.5px] font-semibold text-txt-2 dark:text-fg-2">{money(totalAct)} en activos · <span className="text-negative">{money(totalPas)}</span> en pasivos</div>
      </div>

      <div className="flex justify-center gap-8">
        {[
          { id: 'act' as const, label: 'Activos', sub: money(totalAct) },
          { id: 'pas' as const, label: 'Pasivos', sub: money(totalPas) },
        ].map((b) => (
          <button key={b.id} type="button" onClick={() => setVista(b.id)} className="flex flex-col items-center gap-1.5">
            <span className={cn('flex h-16 w-16 items-center justify-center rounded-full font-display text-[13px] font-bold transition-all duration-[250ms]', vista === b.id ? 'bg-green text-white shadow-green' : 'bg-green-100 text-fg dark:bg-surface-2')}>{b.label[0]}</span>
            <span className="text-[12px] font-semibold">{b.label}</span>
            <span className="text-[11px] text-txt-2 dark:text-fg-2">{b.sub}</span>
          </button>
        ))}
        <button type="button" onClick={() => setAgregar(vista)} className="flex flex-col items-center gap-1.5">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-ink text-white transition-transform hover:scale-105 dark:bg-white dark:text-ink"><Plus size={24} /></span>
          <span className="text-[12px] font-semibold">Agregar</span>
          <span className="text-[11px] text-txt-2 dark:text-fg-2">{vista === 'act' ? 'activo' : 'deuda'}</span>
        </button>
      </div>

      <div key={vista} className="animate-screen space-y-2.5">
        {rubros.length === 0 && <p className="card py-8 text-center text-[12.5px] text-txt-2">Sin {vista === 'act' ? 'activos' : 'pasivos'} todavía. Agrega el primero.</p>}
        {rubros.map((r) => {
          const Icon = r.icon;
          const p = total ? (r.monto / total) * 100 : 0;
          return (
            <button key={r.id} type="button" onClick={() => setRubroSel(r.id)} className="card flex w-full items-center gap-3 px-4 py-3.5 text-left transition-shadow hover:shadow-hover">
              <span className={cn('flex h-10 w-10 flex-none items-center justify-center rounded-full', vista === 'act' ? 'bg-green-50 text-green dark:bg-surface-2' : 'bg-negative-50 text-negative dark:bg-surface-2')}><Icon size={18} /></span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between"><span className="text-[13.5px] font-bold">{r.nombre}</span><span className="font-display text-[15px] font-bold">{money(r.monto)}</span></span>
                <span className="mt-1.5 block h-1.5 rounded-pill bg-line dark:bg-surface-2"><span className={cn('block h-1.5 rounded-pill transition-[width] duration-[550ms] ease-bounce', vista === 'act' ? 'bg-green' : 'bg-negative')} style={{ width: `${p}%` }} /></span>
                <span className="mt-1 block text-[11px] text-txt-2 dark:text-fg-2">{r.items.length} {r.items.length === 1 ? 'elemento' : 'elementos'} · {Math.round(p)} %</span>
              </span>
              <ChevronRight size={18} className="text-txt-3" />
            </button>
          );
        })}
      </div>

      <section className="card p-5">
        <div className="mb-3 flex items-baseline justify-between"><h2 className="font-display text-[16px] font-bold">Estado de resultados · P&amp;L</h2><span className="text-[11.5px] text-txt-2 dark:text-fg-2">{pnl.mes}</span></div>
        <ul className="divide-y divide-edge text-[13px]">
          {[['Ingresos', pnl.ingresos, 'green'], ['Gastos fijos', -pnl.fijos, ''], ['Gastos variables', -pnl.variables, ''], ['Ahorro / inversión', -pnl.ahorro, 'invest']].map(([l, v, t]) => (
            <li key={String(l)} className="flex h-11 items-center justify-between"><span>{l}</span><span className={cn('font-display font-bold', t === 'green' ? 'text-green' : t === 'invest' ? 'text-invest' : '')}>{Number(v) < 0 ? '-' : ''}{money(Math.abs(Number(v)))}</span></li>
          ))}
          <li className="flex h-12 items-center justify-between font-bold"><span>Flujo neto</span><span className={cn('font-display text-[16px]', flujo >= 0 ? 'text-green' : 'text-negative')}>{flujo < 0 ? '-' : ''}{money(Math.abs(flujo))}</span></li>
        </ul>
        {pnl.fijosEsperados > pnl.fijos && <p className="mt-2 text-[11.5px] text-txt-2 dark:text-fg-2">Faltan por cobrarse {money(pnl.fijosEsperados - pnl.fijos)} en fijos este mes.</p>}
      </section>

      <Panel open={!!rubro} onClose={() => setRubroSel(null)} mode="drawer" title={rubro?.nombre}>
        {rubro && <DetalleRubro rubro={rubro} vista={vista} />}
      </Panel>
      <ModalAgregar tipo={agregar} onClose={() => setAgregar(null)} />
    </div>
  );
}

function DetalleRubro({ rubro, vista }: { rubro: Rubro; vista: Vista }) {
  const [pendiente, start] = useTransition();
  const router = useRouter();
  return (
    <div className="space-y-3 pb-4">
      <Money value={rubro.monto} className="text-[30px] font-bold tracking-[-1px]" tone={vista === 'act' ? 'ink' : 'blue'} />
      <ul className="divide-y divide-edge">
        {rubro.items.map((i) => (
          <li key={i.id} className="flex h-16 items-center gap-3">
            <div className="min-w-0 flex-1"><div className="truncate text-[13.5px] font-bold">{i.nombre}</div>{i.sub && <div className="text-[11px] text-txt-2 dark:text-fg-2">{i.sub}</div>}</div>
            <span className="font-display text-[14.5px] font-bold">{money(i.monto)}</span>
            {i.origen !== 'cuenta' && (
              <button type="button" aria-label="Eliminar" disabled={pendiente} onClick={() => start(async () => { if (i.origen === 'activo') await eliminarActivo(i.id); else await eliminarPasivo(i.id); router.refresh(); })} className="flex h-8 w-8 items-center justify-center rounded-full text-txt-3 hover:bg-bg-muted"><Trash2 size={15} /></button>
            )}
          </li>
        ))}
      </ul>
      {rubro.id === 'auto' && <p className="rounded-input bg-bg-page px-3 py-2 text-[11.5px] text-txt-2 dark:bg-surface-2 dark:text-fg-2">Estimación de depreciación anual con base en año y kilometraje. Integración con valuación automática (Kavak) en una fase posterior.</p>}
    </div>
  );
}

function ModalAgregar({ tipo, onClose }: { tipo: Vista | null; onClose: () => void }) {
  const [rubro, setRubro] = useState<string>('casa');
  const [nombre, setNombre] = useState('');
  const [monto, setMonto] = useState('');
  const [tasa, setTasa] = useState('');
  const [anio, setAnio] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pendiente, start] = useTransition();
  const router = useRouter();
  const opciones = tipo === 'act' ? RUBROS_ACT : RUBROS_PAS;
  const guardar = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const r = tipo === 'act'
        ? await guardarActivo({ tipo: rubro as Activo['tipo'], nombre, valor: Number(monto), detalle: rubro === 'auto' ? { anio: Number(anio) || null, depreciacionAnual: 0.12 } : {} })
        : await guardarPasivo({ tipo: rubro as Pasivo['tipo'], nombre, saldo: Number(monto), tasa: tasa ? Number(tasa) : null });
      if (!r.ok) setError(r.error);
      else {
        setNombre(''); setMonto(''); setTasa(''); onClose(); router.refresh();
      }
    });
  };
  return (
    <Panel open={!!tipo} onClose={onClose} mode="modal" title={tipo === 'act' ? 'Agregar activo' : 'Agregar deuda'}>
      <form onSubmit={guardar} className="space-y-3.5 pb-2">
        <div className="flex flex-wrap gap-1.5">
          {opciones.map((o) => <button key={o.id} type="button" onClick={() => setRubro(o.id)} className={cn('rounded-pill border px-3 py-1.5 text-[12px] font-semibold', rubro === o.id ? 'border-ink bg-ink text-white dark:border-white dark:bg-white dark:text-ink' : 'border-line-2 dark:border-edge')}>{o.nombre}</button>)}
        </div>
        <Input label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder={tipo === 'act' ? 'Departamento Del Valle, Tahoe 2022…' : 'Hipoteca BBVA, préstamo…'} required />
        <Input label={tipo === 'act' ? 'Valor estimado' : 'Saldo que debes'} value={monto} onChange={(e) => setMonto(e.target.value.replace(/[^\d]/g, ''))} inputMode="numeric" required />
        {tipo === 'act' && rubro === 'auto' && <Input label="Año del auto" value={anio} onChange={(e) => setAnio(e.target.value.replace(/[^\d]/g, '').slice(0, 4))} inputMode="numeric" placeholder="2022" />}
        {tipo === 'pas' && <Input label="Tasa anual % (opcional)" value={tasa} onChange={(e) => setTasa(e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal" placeholder="9.9" />}
        {error && <p className="text-[12.5px] font-semibold text-negative">{error}</p>}
        <Button type="submit" variant="green" size="lg" full disabled={pendiente}>{pendiente ? 'Guardando…' : 'Guardar'}</Button>
      </form>
    </Panel>
  );
}
