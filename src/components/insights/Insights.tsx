'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, X, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { money } from '@/lib/format';
import type { Insight } from '@/lib/domain/tipos';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { marcarInsight } from '@/app/app/insights/acciones';

type Filtro = 'todos' | 'suscripciones' | 'msi' | 'ahorro' | 'cargos';
const FILTROS: { value: Filtro; label: string; tipos: string[] }[] = [
  { value: 'todos', label: 'Todos', tipos: [] },
  { value: 'suscripciones', label: 'Suscripciones', tipos: ['suscripcion_nueva', 'suscripciones_total'] },
  { value: 'msi', label: 'Meses sin intereses', tipos: ['msi_termina', 'msi_total'] },
  { value: 'ahorro', label: 'Ahorro', tipos: ['puedes_invertir'] },
  { value: 'cargos', label: 'Cargos', tipos: ['cargo_duplicado', 'cargo_tras_cancelar', 'comisiones', 'proximos_cobros'] },
];

// Familia de color por tipo: verde = oportunidad, tinta = información, azul = atención (nunca rojo).
const TONO: Record<string, string> = {
  puedes_invertir: 'bg-green-dark text-white',
  suscripcion_nueva: 'bg-ink text-white',
  suscripciones_total: 'bg-ink text-white',
  msi_termina: 'bg-green-light text-ink',
  msi_total: 'bg-ink text-white',
  cargo_duplicado: 'bg-negative text-white',
  cargo_tras_cancelar: 'bg-negative text-white',
  comisiones: 'bg-negative text-white',
  proximos_cobros: 'bg-surface text-fg border border-edge',
};

export function Insights({ insights }: { insights: Insight[] }) {
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [abierto, setAbierto] = useState<string | null>(null);
  const [, start] = useTransition();
  const router = useRouter();
  const lista = useMemo(() => {
    const f = FILTROS.find((x) => x.value === filtro)!;
    return insights.filter((i) => !f.tipos.length || f.tipos.includes(i.tipo));
  }, [insights, filtro]);

  if (!insights.length) return <EmptyState icon={Bell} titulo="Sin insights por ahora" texto="Cuando tengamos movimientos te avisaremos de suscripciones nuevas, MSI por terminar y cargos duplicados." />;

  const abrir = (i: Insight) => {
    setAbierto(abierto === i.id ? null : i.id);
    if (!i.leido) start(async () => { await marcarInsight(i.id, { leido: true }); });
  };
  const descartar = (i: Insight) =>
    start(async () => {
      await marcarInsight(i.id, { descartado: true });
      router.refresh();
    });

  return (
    <div className="mx-auto max-w-[640px] space-y-4">
      <div className="-mx-3.5 flex gap-1.5 overflow-x-auto px-3.5 md:mx-0 md:px-0">
        {FILTROS.map((f) => (
          <Chip key={f.value} active={filtro === f.value} onClick={() => setFiltro(f.value)} tone="lime">{f.label}</Chip>
        ))}
      </div>
      <div className="space-y-3">
        {lista.map((i) => {
          const open = abierto === i.id;
          const tono = TONO[i.tipo] ?? 'bg-surface text-fg border border-edge';
          const claro = tono.includes('bg-surface') || tono.includes('green-light');
          const sobreVerdeClaro = tono.includes('green-light');
          return (
            <article key={i.id} className={cn('overflow-hidden rounded-20 shadow-card transition-all duration-[250ms]', tono, !i.leido && 'ring-2 ring-green-light/60')}>
              <button type="button" onClick={() => abrir(i)} className="flex w-full items-start gap-3 px-4 py-4 text-left">
                <div className="min-w-0 flex-1">
                  <div className="font-display text-[15.5px] font-bold leading-snug">{i.titulo}</div>
                  {!open && <div className={cn('mt-1 line-clamp-1 text-[12.5px]', sobreVerdeClaro ? 'text-ink/80' : claro ? 'text-txt-2 dark:text-fg-2' : 'text-white')}>{i.texto}</div>}
                </div>
                {i.monto != null && <div className="flex-none font-display text-[16px] font-bold">{money(i.monto)}</div>}
              </button>
              {open && (
                <div className="animate-fade px-4 pb-4">
                  <p className={cn('text-[13px] leading-relaxed', claro ? 'text-txt-2 dark:text-fg-2' : 'opacity-90')}>{i.texto}</p>
                  <div className="mt-3 flex items-center gap-2">
                    {i.ctaHref && (
                      <Link href={i.ctaHref} className={cn('flex h-10 items-center gap-1 rounded-pill px-4 text-[12.5px] font-bold', claro ? 'bg-ink text-white dark:bg-white dark:text-ink' : 'bg-white text-ink')}>
                        {i.ctaLabel ?? 'Ver'} <ChevronRight size={15} />
                      </Link>
                    )}
                    <button type="button" onClick={() => descartar(i)} className={cn('ml-auto flex h-10 items-center gap-1 rounded-pill px-3 text-[12px] font-semibold', claro ? 'text-txt-2 hover:bg-bg-muted' : 'text-white/80 hover:bg-white/10')}>
                      <X size={14} /> Descartar
                    </button>
                  </div>
                </div>
              )}
            </article>
          );
        })}
        {lista.length === 0 && <p className="py-8 text-center text-[12.5px] text-txt-2">Nada en esta categoría.</p>}
      </div>
    </div>
  );
}
