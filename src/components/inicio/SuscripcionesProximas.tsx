'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { money, fechaCorta } from '@/lib/format';
import { aISO, deISO, sumarDias } from '@/lib/domain/fechas';
import { cobrosProximos } from '@/lib/domain/recurrentes';
import type { Recurrente } from '@/lib/domain/tipos';
import { Avatar } from '@/components/ui/Avatar';

function badge(fecha: string, hoy: Date): { texto: string; fuerte: boolean } {
  if (fecha === aISO(hoy)) return { texto: 'Hoy', fuerte: true };
  if (fecha === aISO(sumarDias(hoy, 1))) return { texto: 'Mañana', fuerte: true };
  if (fecha === aISO(sumarDias(hoy, 3))) return { texto: 'En 3 días', fuerte: false };
  return { texto: fechaCorta(fecha), fuerte: false };
}

/** Suscripciones y cargos fijos de los próximos 7 días, con badge de cuándo. */
export function SuscripcionesProximas({ recurrentes, hoy }: { recurrentes: Recurrente[]; hoy: string }) {
  const h = deISO(hoy);
  const { lista, total } = cobrosProximos(recurrentes, h, 7);
  const activas = recurrentes.filter((r) => r.activo && !r.canceladoAt && r.tipo === 'suscripcion').length;
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-[19px] font-bold tracking-[-0.3px]">Suscripciones</h2>
        <Link href="/app/fijos" className="flex items-center gap-0.5 text-[12.5px] font-semibold text-green-dark dark:text-green-light">Ver todas <ChevronRight size={15} /></Link>
      </div>
      <div className="card overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-edge px-4 py-3 text-[12.5px]">
          <span className="text-txt-2 dark:text-fg-2">{activas === 1 ? '1 suscripción activa' : `${activas} suscripciones activas`}</span>
          <span className="font-bold">{lista.length ? `${money(total)} en 7 días` : 'Sin cobros en 7 días'}</span>
        </div>
        {lista.length > 0 && (
          <ul className="divide-y divide-edge">
            {lista.slice(0, 5).map((c) => {
              const b = badge(c.fecha, h);
              return (
                <li key={c.recurrente.id}>
                  <Link href={`/app/fijos?recurrente=${c.recurrente.id}`} className="flex h-[60px] items-center gap-3 px-4 transition-colors hover:bg-bg-hover dark:hover:bg-surface-2">
                    <Avatar domain={c.recurrente.comercioDominio} nombre={c.recurrente.nombre} size={38} logoPct={60} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13.5px] font-bold">{c.recurrente.nombre}</div>
                      <div className="text-[11.5px] text-txt-2 dark:text-fg-2">{c.recurrente.frecuencia === 'anual' ? 'Cada año' : c.recurrente.frecuencia === 'semanal' ? 'Cada semana' : 'Cada mes'}</div>
                    </div>
                    <span className={cn('rounded-pill px-2 py-0.5 text-[10.5px] font-bold', b.fuerte ? 'bg-green-light text-ink' : 'bg-bg-muted text-txt-2 dark:bg-surface-2 dark:text-fg-2')}>{b.texto}</span>
                    <span className="w-[72px] text-right font-display text-[14px] font-bold">{money(c.monto)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
