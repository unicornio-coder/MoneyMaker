'use client';

import { useEffect, useRef } from 'react';
import { money } from '@/lib/format';
import { costoMensual } from '@/lib/domain/recurrentes';
import type { Recurrente } from '@/lib/domain/tipos';
import { Avatar } from '@/components/ui/Avatar';

const GRUPOS: { id: string; titulo: string; filtro: (r: Recurrente) => boolean }[] = [
  { id: 'sus', titulo: 'Suscripciones', filtro: (r) => r.tipo === 'suscripcion' },
  { id: 'casa', titulo: 'Cargos de la casa', filtro: (r) => r.tipo === 'servicio' },
  { id: 'msi', titulo: 'Meses sin intereses', filtro: (r) => r.tipo === 'msi' },
  { id: 'col', titulo: 'Colegiaturas', filtro: (r) => r.tipo === 'colegiatura' },
  { id: 'otros', titulo: 'Otros fijos', filtro: (r) => r.tipo === 'otro' },
];

export function TablasRecurrentes({ recurrentes, onAbrir, seccionInicial }: { recurrentes: Recurrente[]; onAbrir: (id: string) => void; seccionInicial?: string }) {
  const refs = useRef<Record<string, HTMLDivElement | null>>({});
  useEffect(() => {
    if (seccionInicial && refs.current[seccionInicial]) refs.current[seccionInicial]!.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
  }, [seccionInicial]);

  return (
    <div className="snap-x-carousel -mx-3.5 px-3.5 md:mx-0 md:px-0 xl:grid xl:grid-cols-4 xl:gap-3.5">
      {GRUPOS.map((g) => {
        const lista = recurrentes.filter(g.filtro).sort((a, b) => (a.diaCobro ?? 0) - (b.diaCobro ?? 0));
        if (!lista.length) return null;
        const total = lista.reduce((s, r) => s + (r.tipo === 'msi' ? r.monto : costoMensual(r)), 0);
        return (
          <div key={g.id} ref={(el) => { refs.current[g.id] = el; }} className="w-[330px] rounded-16 bg-ink text-white shadow-dark xl:w-auto">
            <div className="flex items-baseline justify-between px-4 pb-2 pt-4">
              <div className="text-[13.3px] font-bold">{g.titulo}</div>
              <div className="font-display text-[19px] font-bold">{money(total)}<span className="ml-1 text-[11px] font-normal text-white/60">/mes</span></div>
            </div>
            <ul className="max-h-[264px] overflow-y-auto px-2 pb-2">
              {lista.map((r) => (
                <li key={r.id}>
                  <button type="button" onClick={() => onAbrir(r.id)} className="flex h-[56px] w-full items-center gap-3 rounded-input px-2 text-left transition-colors hover:bg-white/8">
                    <Avatar domain={r.comercioDominio} nombre={r.nombre} size={38} bg="rgba(255,255,255,0.12)" className="text-white" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-bold">{r.nombre}</div>
                      <div className="text-[11px] text-white/60">
                        {r.tipo === 'msi' && r.msiCuotasTotal ? `Cuota ${r.msiCuotasPagadas ?? 0} de ${r.msiCuotasTotal} · ` : ''}
                        {r.diaCobro ? `día ${r.diaCobro}` : r.frecuencia}
                        {r.veces === 1 && r.tipo === 'suscripcion' ? ' · nueva' : ''}
                      </div>
                    </div>
                    <div className="font-display text-[14px] font-bold">{money(r.monto)}</div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
