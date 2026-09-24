'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Banknote, FileText, Bell, PieChart, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { money, fechaCorta, pct } from '@/lib/format';
import { categoria } from '@/lib/domain/categorias';
import type { Movimiento } from '@/lib/domain/tipos';
import { Panel } from '@/components/ui/Panel';
import { Money } from '@/components/ui/Money';
import { Avatar } from '@/components/ui/Avatar';
import type { CuentaVista } from './tipos';

type Props = { cuenta: CuentaVista | null; movimientos: Movimiento[]; cuentas: CuentaVista[]; onClose: () => void };

function LineaInversion({ serie }: { serie: number[] }) {
  const mx = Math.max(...serie);
  const mn = Math.min(...serie) * 0.97;
  const pts = serie.map((v, i) => [i * (300 / (serie.length - 1)), 90 - ((v - mn) / (mx - mn || 1)) * 80] as const);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const fin = pts[pts.length - 1];
  return (
    <svg viewBox="0 0 300 100" className="h-[100px] w-full" preserveAspectRatio="none" aria-hidden>
      <path d={`${d} L300 100 L0 100 Z`} fill="rgba(22,163,74,0.10)" />
      <path d={d} fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={fin[0]} cy={fin[1]} r="5" fill="#16A34A" />
    </svg>
  );
}

export function DrawerCuenta({ cuenta, movimientos, cuentas, onClose }: Props) {
  const [verTodo, setVerTodo] = useState(false);
  const movs = useMemo(() => (cuenta ? movimientos.filter((m) => m.cuentaId === cuenta.id) : []), [cuenta, movimientos]);
  if (!cuenta) return null;

  const esCredito = cuenta.tipo === 'credito';
  const esInversion = cuenta.tipo === 'inversion';
  const color = cuenta.color || '#0B1F17';
  const hermanas = cuentas.filter((c) => c.banco === cuenta.banco && c.id !== cuenta.id);
  const ingresosMes = movs.filter((m) => m.tipo === 'ingreso').slice(0, 30).reduce((s, m) => s + m.monto, 0);
  const gastadoMes = movs.filter((m) => m.tipo === 'gasto').slice(0, 30).reduce((s, m) => s + m.monto, 0);

  const tiles: [string, string, boolean][] = esCredito
    ? [['Sin intereses', money(cuenta.saldo), true], ['Mínimo', money(cuenta.pagoMinimo ?? 0), false], ['Límite', cuenta.limite ? money(cuenta.limite) : '—', false]]
    : esInversion
      ? [['Rendimiento', cuenta.inversion?.rendimiento || '—', true], ['Posiciones', String(cuenta.inversion?.posiciones.length ?? 0), false], ['Aportado', money(cuenta.inversion?.aportado ?? 0), false]]
      : [['Ingresos', money(ingresosMes), true], ['Gastado', money(gastadoMes), false], ['Libre', money(Math.max(0, cuenta.saldo)), false]];

  const acciones = [
    esCredito && { label: 'Pagar', icon: Banknote, href: cuenta.bancoDominio ? `https://${cuenta.bancoDominio}` : '#', externo: true },
    { label: 'Estado', icon: FileText, onClick: () => setVerTodo(true) },
    esCredito && { label: 'Recordar', icon: Bell, href: `/app/fijos?vista=cal&pago=${cuenta.id}` },
    { label: 'Gastos', icon: PieChart, href: `/app/gastos?cuenta=${cuenta.id}` },
  ].filter(Boolean) as { label: string; icon: typeof Banknote; href?: string; onClick?: () => void; externo?: boolean }[];

  const lista = verTodo ? movs : movs.slice(0, 5);

  return (
    <Panel open={!!cuenta} onClose={onClose} mode="drawer" title={<span className="flex items-center gap-2.5"><Avatar domain={cuenta.bancoDominio} nombre={cuenta.banco} size={36} logoPct={60} /> {cuenta.nombre}</span>}>
      <div className="space-y-4 pb-4">
        <div className="relative overflow-hidden rounded-sheet px-4 pb-4 pt-[18px] text-center text-white" style={{ background: `linear-gradient(135deg, ${color} 0%, ${color} 55%, rgba(255,255,255,0.28) 100%), ${color}` }}>
          <span className="inline-flex items-center gap-2 rounded-pill bg-white/15 px-3 py-1 text-[12px] font-bold tracking-[2px]">
            <span className="h-[13px] w-[18px] rounded-[3px] bg-[#F5D77A]" />
            {cuenta.ultimos4 ? `•••• ${cuenta.ultimos4}` : cuenta.tipo.toUpperCase()}
          </span>
          <div className="mt-3 text-[11px] text-white/70">{esCredito ? `Saldo al corte · ${cuenta.fechaCorte ? fechaCorta(cuenta.fechaCorte) : 'corte'}` : esInversion ? 'Valor actual · hoy' : 'Saldo disponible · hoy'}</div>
          <Money value={cuenta.saldo} className="mt-0.5 block text-[32px] font-bold leading-none tracking-[-1.2px] text-white" />
          {esCredito && cuenta.fechaLimite && <div className="mt-1.5 text-[11px] text-white/70">Paga antes del {fechaCorta(cuenta.fechaLimite)}</div>}
          <div className="mt-4 flex justify-center gap-4">
            {acciones.map((a) => {
              const Icon = a.icon;
              const inner = (
                <>
                  <span className="flex h-[46px] w-[46px] items-center justify-center rounded-full bg-white/12 transition-colors hover:bg-white/20"><Icon size={19} /></span>
                  <span className="text-[10.5px] font-semibold">{a.label}</span>
                </>
              );
              return a.href ? (
                <Link key={a.label} href={a.href} target={a.externo ? '_blank' : undefined} className="flex flex-col items-center gap-1.5">{inner}</Link>
              ) : (
                <button key={a.label} type="button" onClick={a.onClick} className="flex flex-col items-center gap-1.5">{inner}</button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {tiles.map(([label, valor, verde]) => (
            <div key={label} className={cn('rounded-card px-3 py-2.5', verde ? 'bg-green-50 dark:bg-surface-2' : 'bg-bg-page dark:bg-surface-2')}>
              <div className="text-[10.5px] font-semibold text-txt-2 dark:text-fg-2">{label}</div>
              <div className="font-display text-[14.5px] font-bold">{valor}</div>
            </div>
          ))}
        </div>

        {esInversion && cuenta.inversion && (
          <>
            <div className="card p-4">
              <div className="flex items-center justify-between">
                <div className="text-[13px] font-bold">Cómo va tu inversión</div>
                <div className="text-[12px] font-bold text-green">{cuenta.inversion.rendimiento}</div>
              </div>
              <div className="mt-2"><LineaInversion serie={cuenta.inversion.serie} /></div>
            </div>
            {cuenta.inversion.posiciones.length > 0 && (
              <div>
                <div className="section-label mb-2">En qué estás invertido</div>
                <ul className="divide-y divide-edge">
                  {cuenta.inversion.posiciones.map((p) => (
                    <li key={p.ticker} className="flex h-[60px] items-center gap-3">
                      <Avatar domain={p.dominio} nombre={p.ticker} size={42} logoPct={56} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13.5px] font-bold">{p.nombre}</div>
                        <div className="text-[11px] text-txt-2 dark:text-fg-2">{p.cantidad} {p.ticker} · {Math.round((p.valor / cuenta.saldo) * 100)} % del portafolio</div>
                      </div>
                      <div className="text-right">
                        <div className="font-display text-[14.5px] font-bold">{money(p.valor)}</div>
                        <div className={cn('text-[11px] font-bold', p.variacion < 0 ? 'text-negative' : 'text-green')}>{pct(p.variacion)}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {hermanas.length > 0 && (
          <div className="rounded-card bg-bg-page px-3.5 py-3 text-[12px] dark:bg-surface-2">
            <span className="font-semibold">{hermanas.length + 1} tarjetas de {cuenta.banco} conectadas:</span> {[cuenta, ...hermanas].map((c) => `${c.nombre} ${c.ultimos4 ? '··' + c.ultimos4 : ''}`).join(', ')}
          </div>
        )}

        <div>
          <div className="section-label mb-2">{esCredito ? 'Compras del periodo' : 'Movimientos'}</div>
          {movs.length === 0 ? (
            <p className="py-6 text-center text-[12.5px] text-txt-2">Sin movimientos todavía.</p>
          ) : (
            <ul className="divide-y divide-edge">
              {lista.map((m) => (
                <li key={m.id} className="flex h-[60px] items-center gap-3">
                  <Avatar domain={m.comercioDominio} nombre={m.comercio} size={42} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] font-bold">{m.comercio}{m.esMsi && m.msiCuota ? ` · cuota ${m.msiCuota}/${m.msiTotal}` : ''}</div>
                    <div className="truncate text-[11px] text-txt-2 dark:text-fg-2">{fechaCorta(m.fecha)} · {m.detalle ?? categoria(m.categoriaId).nombre}</div>
                  </div>
                  <Money value={m.monto} tone={m.tipo === 'ingreso' ? 'green' : 'inherit'} signed={m.tipo === 'ingreso'} className="text-[14.5px] font-bold" />
                </li>
              ))}
            </ul>
          )}
          {!verTodo && movs.length > 5 && (
            <button type="button" onClick={() => setVerTodo(true)} className="mt-2 flex h-[50px] w-full items-center justify-center gap-1 rounded-card text-[13px] font-bold text-green hover:bg-green-50 dark:hover:bg-surface-2">
              Ver más <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>
    </Panel>
  );
}
