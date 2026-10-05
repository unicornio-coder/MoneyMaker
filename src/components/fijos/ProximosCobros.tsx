'use client';

import { cn } from '@/lib/cn';
import { money, fechaCorta } from '@/lib/format';
import { aISO, deISO, sumarDias } from '@/lib/domain/fechas';
import { cobrosProximos } from '@/lib/domain/recurrentes';
import type { Recurrente } from '@/lib/domain/tipos';
import { Avatar } from '@/components/ui/Avatar';

function badge(fecha: string, hoy: Date): { texto: string; fuerte: boolean } {
  if (fecha === aISO(hoy)) return { texto: 'Hoy', fuerte: true };
  if (fecha === aISO(sumarDias(hoy, 1))) return { texto: 'Mañana', fuerte: true };
  return { texto: fechaCorta(fecha), fuerte: false };
}

/** Debajo de las tablas de Suscripciones: qué se cobra en los próximos 30 días, en orden, con el total. */
export function ProximosCobros({ recurrentes, hoy, onAbrir }: { recurrentes: Recurrente[]; hoy: string; onAbrir: (id: string) => void }) {
  const h = deISO(hoy);
  const { lista, total } = cobrosProximos(recurrentes, h, 30);
  return (
    <section className="space-y-3" aria-label="Próximos cobros">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-[19px] font-bold tracking-[-0.3px]">Próximos 30 días</h2>
        <span className="text-[12.5px] font-bold">{lista.length ? `${money(total)} en ${lista.length === 1 ? '1 cobro' : `${lista.length} cobros`}` : 'Sin cobros'}</span>
      </div>
      <div className="card overflow-hidden p-0">
        {lista.length === 0 ? (
          <p className="px-4 py-6 text-center text-[12.5px] text-txt-2 dark:text-fg-2">Nada por cobrar en el próximo mes.</p>
        ) : (
          <ul className="divide-y divide-edge">
            {lista.map((c, i) => {
              const b = badge(c.fecha, h);
              return (
                <li key={`${c.recurrente.id}-${c.fecha}`} className={cn(i < 10 && 'animate-rise')} style={i < 10 ? { animationDelay: `${i * 35}ms` } : undefined}>
                  <button type="button" onClick={() => onAbrir(c.recurrente.id)} className="flex h-[60px] w-full items-center gap-3 px-4 text-left transition-colors hover:bg-bg-hover dark:hover:bg-surface-2">
                    <Avatar domain={c.recurrente.comercioDominio} nombre={c.recurrente.nombre} size={38} logoPct={60} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13.5px] font-bold">{c.recurrente.nombre}</div>
                      <div className="text-[11.5px] text-txt-2 dark:text-fg-2">{c.recurrente.tipo === 'msi' && c.recurrente.msiCuotasTotal ? `Cuota ${(c.recurrente.msiCuotasPagadas ?? 0) + 1} de ${c.recurrente.msiCuotasTotal}` : c.recurrente.frecuencia === 'anual' ? 'Cada año' : c.recurrente.frecuencia === 'semanal' ? 'Cada semana' : 'Cada mes'}</div>
                    </div>
                    <span className={cn('rounded-pill px-2 py-0.5 text-[10.5px] font-bold', b.fuerte ? 'bg-green-light text-ink' : 'bg-bg-muted text-txt-2 dark:bg-surface-2 dark:text-fg-2')}>{b.texto}</span>
                    <span className="w-[72px] text-right font-display text-[14px] font-bold">{money(c.monto)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
