'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/cn';
import { money, fechaCorta } from '@/lib/format';
import { costoMensual, proximoCobro } from '@/lib/domain/recurrentes';
import type { Recurrente } from '@/lib/domain/tipos';
import { Avatar } from '@/components/ui/Avatar';

const GRUPOS: { id: string; titulo: string; filtro: (r: Recurrente) => boolean }[] = [
  { id: 'sus', titulo: 'Suscripciones', filtro: (r) => r.tipo === 'suscripcion' },
  { id: 'casa', titulo: 'Cargos de la casa', filtro: (r) => r.tipo === 'servicio' },
  { id: 'msi', titulo: 'Meses sin intereses', filtro: (r) => r.tipo === 'msi' },
  { id: 'col', titulo: 'Colegiaturas', filtro: (r) => r.tipo === 'colegiatura' },
  { id: 'otros', titulo: 'Otros fijos', filtro: (r) => r.tipo === 'otro' },
];

const CICLO: Record<string, string> = { mensual: 'Cada mes', anual: 'Cada año', semanal: 'Cada semana', quincenal: 'Cada quincena' };

function badge(dias: number): { texto: string; fuerte: boolean } {
  if (dias <= 0) return { texto: 'Hoy', fuerte: true };
  if (dias === 1) return { texto: 'Mañana', fuerte: true };
  if (dias <= 7) return { texto: `En ${dias} días`, fuerte: false };
  return { texto: '', fuerte: false };
}

/** Lista vertical por grupo (como una app de recordatorios): logo, nombre, ciclo y próximo cobro, badge y monto. */
export function TablasRecurrentes({ recurrentes, onAbrir, seccionInicial }: { recurrentes: Recurrente[]; onAbrir: (id: string) => void; seccionInicial?: string }) {
  const refs = useRef<Record<string, HTMLElement | null>>({});
  useEffect(() => {
    if (seccionInicial && refs.current[seccionInicial]) refs.current[seccionInicial]!.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [seccionInicial]);
  const hoy = Date.now();

  return (
    <div className="grid min-w-0 gap-5 xl:grid-cols-2">
      {GRUPOS.map((g) => {
        const lista = recurrentes.filter(g.filtro).sort((a, b) => proximoCobro(a).getTime() - proximoCobro(b).getTime());
        if (!lista.length) return null;
        const total = lista.reduce((s, r) => s + (r.tipo === 'msi' ? r.monto : costoMensual(r)), 0);
        return (
          <section key={g.id} ref={(el) => { refs.current[g.id] = el; }} className="min-w-0 space-y-2.5">
            <div className="flex min-w-0 items-baseline justify-between gap-2">
              <h2 className="font-display text-[19px] font-bold tracking-[-0.3px]">{g.titulo}</h2>
              <div className="flex-none whitespace-nowrap text-[12.5px] text-txt-2 dark:text-fg-2"><b className="font-display text-[15px] text-fg">{money(total)}</b> al mes</div>
            </div>
            <ul className="card divide-y divide-edge overflow-hidden p-0">
              {lista.map((r, i) => {
                const proximo = proximoCobro(r);
                const dias = Math.round((proximo.getTime() - hoy) / 86_400_000);
                const b = badge(dias);
                return (
                  <li key={r.id} className={cn(i < 8 && 'animate-rise')} style={i < 8 ? { animationDelay: `${i * 40}ms` } : undefined}>
                    <button type="button" onClick={() => onAbrir(r.id)} className="flex h-[64px] w-full items-center gap-3 px-4 text-left transition-colors hover:bg-bg-hover dark:hover:bg-surface-2">
                      <Avatar domain={r.comercioDominio} nombre={r.nombre} size={40} logoPct={60} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[14px] font-bold">{r.nombre}{r.veces === 1 && r.tipo === 'suscripcion' ? <span className="ml-1.5 rounded-pill bg-green-50 px-1.5 py-0.5 text-[10px] font-bold text-green-dark dark:bg-surface-2 dark:text-green-light">Nueva</span> : null}</div>
                        <div className="truncate text-[11.5px] text-txt-2 dark:text-fg-2">
                          {r.tipo === 'msi' && r.msiCuotasTotal ? `Cuota ${r.msiCuotasPagadas ?? 0} de ${r.msiCuotasTotal}` : CICLO[r.frecuencia] ?? 'Cada mes'} · próximo {fechaCorta(proximo)}
                        </div>
                      </div>
                      {b.texto && <span className={cn('rounded-pill px-2 py-0.5 text-[10.5px] font-bold', b.fuerte ? 'bg-green-light text-ink' : 'bg-bg-muted text-txt-2 dark:bg-surface-2 dark:text-fg-2')}>{b.texto}</span>}
                      <span className="w-[76px] text-right font-display text-[14.5px] font-bold">{money(r.monto)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
