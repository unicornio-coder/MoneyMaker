'use client';

import { useMemo, useState } from 'react';
import { TrendingUp, Plus, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { money } from '@/lib/format';
import { deISO, sumarMeses } from '@/lib/domain/fechas';
import { mesDe, enRango } from '@/lib/domain/quincena';
import type { Movimiento } from '@/lib/domain/tipos';
import { Chip } from '@/components/ui/Chip';
import { Avatar } from '@/components/ui/Avatar';
import { Money } from '@/components/ui/Money';
import { EmptyState } from '@/components/ui/EmptyState';
import { DrawerCuenta } from '@/components/inicio/DrawerCuenta';
import { ModalBancos } from '@/components/cuentas/ModalBancos';
import type { CuentaVista, DatosInicio } from '@/components/inicio/tipos';

type Props = { cuentas: CuentaVista[]; movimientos: Movimiento[]; instituciones: DatosInicio['instituciones']; agregador: 'belvo' | 'mock'; sandbox?: boolean; hoy: string };

function Linea({ serie, alto = 120 }: { serie: number[]; alto?: number }) {
  const mx = Math.max(...serie);
  const mn = Math.min(...serie) * 0.97;
  const pts = serie.map((v, i) => [i * (300 / (serie.length - 1)), alto - 10 - ((v - mn) / (mx - mn || 1)) * (alto - 20)] as const);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const fin = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 300 ${alto}`} className="w-full" style={{ height: alto }} preserveAspectRatio="none" aria-hidden>
      <path d={`${d} L300 ${alto} L0 ${alto} Z`} fill="rgba(22,163,74,0.10)" />
      <path d={d} fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={fin[0]} cy={fin[1]} r="5" fill="#16A34A" />
    </svg>
  );
}

export function Inversiones({ cuentas, movimientos, instituciones, agregador, sandbox, hoy }: Props) {
  const [sel, setSel] = useState<string | 'total'>('total');
  const [abierta, setAbierta] = useState<string | null>(null);
  const [bancos, setBancos] = useState(false);
  const total = cuentas.reduce((s, c) => s + c.saldo, 0);
  const serie = useMemo(() => {
    if (sel !== 'total') return cuentas.find((c) => c.id === sel)?.inversion?.serie ?? [0, 0];
    const n = 11;
    return Array.from({ length: n }, (_, i) => cuentas.reduce((s, c) => s + (c.inversion?.serie[i] ?? c.saldo), 0));
  }, [cuentas, sel]);
  const variacion = serie.length > 1 && serie[0] ? ((serie[serie.length - 1] - serie[0]) / serie[0]) * 100 : 0;
  const meses = useMemo(() => {
    const h = deISO(hoy);
    return Array.from({ length: 6 }, (_, i) => {
      const r = mesDe(sumarMeses(h, i - 5));
      const ids = sel === 'total' ? cuentas.map((c) => c.id) : [sel];
      const aport = movimientos.filter((m) => ids.includes(m.cuentaId) && enRango(m.fecha, r) && (m.tipo === 'transferencia' || m.tipo === 'gasto')).reduce((s, m) => s + m.monto, 0);
      const rend = movimientos.filter((m) => ids.includes(m.cuentaId) && enRango(m.fecha, r) && m.tipo === 'ingreso').reduce((s, m) => s + m.monto, 0);
      return { r, aport, rend };
    });
  }, [movimientos, cuentas, sel, hoy]);
  const maxMes = Math.max(1, ...meses.map((m) => m.aport + m.rend));
  const cuenta = cuentas.find((c) => c.id === abierta) ?? null;

  if (!cuentas.length) {
    return (
      <>
        <EmptyState icon={TrendingUp} titulo="Conecta una cuenta de inversión" texto="GBM+, Bitso, CetesDirecto o Kuspit. También puedes subir su estado de cuenta." cta={{ label: 'Conectar', onClick: () => setBancos(true) }} />
        <ModalBancos open={bancos} onClose={() => setBancos(false)} instituciones={instituciones} agregador={agregador} sandbox={sandbox} />
      </>
    );
  }

  return (
    <div className="mx-auto max-w-[720px] space-y-5">
      <div className="card p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[12.5px] text-txt-2 dark:text-fg-2">Total invertido</div>
            <Money value={sel === 'total' ? total : (cuentas.find((c) => c.id === sel)?.saldo ?? 0)} animate className="block text-[34px] font-bold leading-none tracking-[-1.2px]" tone="ink" />
          </div>
          <div className={cn('rounded-pill px-2.5 py-1 text-[12px] font-bold', variacion >= 0 ? 'bg-green-50 text-green dark:bg-surface-2 dark:text-green-light' : 'bg-negative-50 text-negative')}>{variacion >= 0 ? '+' : ''}{variacion.toFixed(1)} % · 30 días</div>
        </div>
        <div className="mt-3 flex gap-1.5 overflow-x-auto">
          <Chip active={sel === 'total'} onClick={() => setSel('total')} size="sm">Total</Chip>
          {cuentas.map((c) => <Chip key={c.id} active={sel === c.id} onClick={() => setSel(c.id)} size="sm">{c.nombre}</Chip>)}
        </div>
        <div className="mt-3"><Linea serie={serie} /></div>
      </div>

      <button type="button" onClick={() => setBancos(true)} className="flex h-16 w-full items-center gap-3 rounded-16 border border-edge bg-surface px-3 text-left transition-shadow hover:shadow-hover">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-green text-white"><Plus size={18} /></span>
        <span className="flex-1"><span className="block text-[13.5px] font-bold">Conectar cuenta de inversión</span><span className="block text-[11px] text-txt-2 dark:text-fg-2">GBM+, Bitso, CetesDirecto, Kuspit o bancos</span></span>
        <ChevronRight size={18} className="text-txt-3" />
      </button>

      <section>
        <h2 className="mb-2 font-display text-[16px] font-bold">Cuentas conectadas</h2>
        <ul className="card divide-y divide-edge p-0">
          {cuentas.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => setAbierta(c.id)} className="flex h-[68px] w-full items-center gap-3 px-4 text-left hover:bg-bg-hover dark:hover:bg-surface-2">
                <Avatar domain={c.bancoDominio} nombre={c.banco} size={42} logoPct={58} />
                <span className="min-w-0 flex-1"><span className="block truncate text-[13.5px] font-bold">{c.nombre}</span><span className="block text-[11px] text-green">{c.inversion?.rendimiento}</span></span>
                <Money value={c.saldo} className="text-[15px] font-bold" />
                <ChevronRight size={18} className="text-txt-3" />
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="card p-5">
        <h2 className="mb-3 font-display text-[15px] font-bold">Aportaciones y rendimiento por mes</h2>
        <div className="grid grid-cols-6 items-end gap-2" style={{ height: 140 }}>
          {meses.map((m) => (
            <div key={m.r.inicio} className="flex h-full flex-col items-center justify-end gap-1.5">
              <span className="text-[10px] font-bold text-fg">{m.aport + m.rend > 0 ? money(m.aport + m.rend) : ''}</span>
              <div className="flex w-4 flex-col justify-end overflow-hidden rounded-pill bg-line dark:bg-surface-2" style={{ height: 96 }}>
                <div className="w-full bg-green-light" style={{ height: (m.rend / maxMes) * 96 }} />
                <div className="w-full bg-green" style={{ height: (m.aport / maxMes) * 96 }} />
              </div>
              <span className="text-[11px] font-semibold text-txt-2 dark:text-fg-2">{m.r.corta}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-4 text-[11px] font-semibold text-txt-2 dark:text-fg-2"><span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-green" /> Aportaciones</span><span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-green-light" /> Rendimiento</span></div>
      </section>

      <p className="text-center text-[10.3px] text-txt-3">Información educativa, no es asesoría de inversión.</p>

      <DrawerCuenta cuenta={cuenta} movimientos={movimientos} cuentas={cuentas} onClose={() => setAbierta(null)} />
      <ModalBancos open={bancos} onClose={() => setBancos(false)} instituciones={instituciones} agregador={agregador} sandbox={sandbox} />
    </div>
  );
}
