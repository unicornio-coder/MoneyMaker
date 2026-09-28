'use client';

import { useState, useTransition } from 'react';
import { iniciarCheckout, abrirPortal } from '@/app/app/planes/acciones';
import { Check, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/cn';
import { fechaCorta, formatMXN as mxn } from '@/lib/format';
import { PRECIOS, ahorroAnual, type Nivel } from '@/lib/domain/plan';

const GRATIS = ['1 banco conectado o 1 estado de cuenta al mes', 'Movimientos con categoría, notas y búsqueda', 'Suscripciones y meses sin intereses detectados', 'Presupuesto por quincena con alertas', 'Cancelación guiada con enlace directo'];
const PLUS = ['Bancos y estados de cuenta ilimitados', 'Actualización diaria y al abrir la app', '"Cancelar por mí": carta enviada y seguimiento', 'Negociar tu tarifa con carta y guion', 'Resumen del domingo y avisos de cobros', 'Exportar tus movimientos'];

type Props = { plan: 'trial' | 'gratis' | 'plus'; nivel: Nivel; trialTermina: string; planRenueva: string | null; planIntervalo: 'mes' | 'anio' | null; tieneSuscripcion: boolean; cobroActivo: boolean; pago?: string };

export function Planes({ plan, nivel, trialTermina, planRenueva, planIntervalo, tieneSuscripcion, cobroActivo, pago }: Props) {
  const [anual, setAnual] = useState(planIntervalo === 'anio');
  const [error, setError] = useState<string | null>(null);
  const [pendiente, start] = useTransition();
  const contratar = () => start(async () => { const r = await iniciarCheckout(anual ? 'anio' : 'mes'); if (r && !r.ok) setError(r.error); });
  const portal = () => start(async () => { const r = await abrirPortal(); if (r && !r.ok) setError(r.error); });
  const enPrueba = plan === 'trial' && nivel === 'plus';
  const estado = plan === 'plus' ? `Eres Plus. Se renueva el ${planRenueva ? fechaCorta(planRenueva) : '—'}.` : enPrueba ? `Tienes Plus de prueba hasta el ${fechaCorta(planRenueva ?? trialTermina)}.` : 'Estás en el plan Gratis. Nada se borra; Plus abre todo.';
  return (
    <div className="mx-auto max-w-[760px] space-y-5">
      <div className="text-center">
        <h2 className="font-display text-[26px] font-bold tracking-[-0.8px]">Gratis para empezar. Plus para todo.</h2>
        <p className="mt-1 text-[13.5px] text-txt-2 dark:text-fg-2">{estado}</p>
        {pago === 'ok' && <p className="mt-2 text-[13px] font-semibold text-green-dark dark:text-green-light">Listo. Tu suscripción quedó activa.</p>}
        {pago === 'cancelado' && <p className="mt-2 text-[13px] text-txt-2">No se hizo ningún cargo.</p>}
        {error && <p className="mt-2 text-[13px] font-semibold text-negative">{error}</p>}
      </div>
      <div className="mx-auto flex w-fit gap-1 rounded-pill bg-bg-muted p-1 dark:bg-surface-2">
        {[['Mensual', false], [`Anual · ahorra ${mxn(ahorroAnual())}`, true]].map(([l, v]) => (
          <button key={String(l)} type="button" aria-pressed={anual === v} onClick={() => setAnual(v as boolean)} className={cn('h-9 rounded-pill px-4 text-[12.5px] font-semibold transition-colors', anual === v ? 'bg-surface shadow-card' : 'text-txt-2 dark:text-fg-2')}>{l}</button>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className={cn('rounded-20 border-2 p-6', nivel === 'gratis' ? 'border-ink bg-surface dark:border-white' : 'border-edge bg-surface')}>
          <div className="text-[12px] font-bold uppercase tracking-[0.9px] text-txt-2 dark:text-fg-2">{nivel === 'gratis' ? 'Tu plan actual · Gratis' : 'Gratis'}</div>
          <div className="mt-2 font-display text-[40px] font-bold leading-none tracking-[-1.5px]">$0<span className="text-[16px] font-semibold text-txt-2 dark:text-fg-2"> MXN</span></div>
          <ul className="mt-5 space-y-2.5">
            {GRATIS.map((b) => (
              <li key={b} className="flex items-start gap-2 text-[13px]"><Check size={16} className="mt-0.5 flex-none text-txt-2 dark:text-fg-2" /> {b}</li>
            ))}
          </ul>
          <p className="mt-6 text-[12px] text-txt-3">Sin tarjeta. Para siempre.</p>
        </div>
        <div className={cn('rounded-20 border-2 p-6', nivel === 'plus' ? 'border-green bg-green-50 dark:bg-surface-2' : 'border-green bg-surface')}>
          <div className="text-[12px] font-bold uppercase tracking-[0.9px] text-green-dark dark:text-green-light">{plan === 'plus' ? 'Tu plan actual · Plus' : enPrueba ? 'Tu plan actual · Plus de prueba' : 'Plus'}</div>
          <div className="mt-2 font-display text-[40px] font-bold leading-none tracking-[-1.5px]">{anual ? mxn(PRECIOS.anio) : mxn(PRECIOS.mes)}<span className="text-[16px] font-semibold text-txt-2 dark:text-fg-2"> MXN/{anual ? 'año' : 'mes'}</span></div>
          <div className="mt-1.5 text-[12.5px] text-txt-2 dark:text-fg-2">{anual ? `${mxn(Math.round(PRECIOS.anio / 12))} al mes, pagado una vez al año.` : 'Menos de $5 al día. Una suscripción olvidada cuesta más.'}</div>
          <ul className="mt-5 space-y-2.5">
            {PLUS.map((b) => (
              <li key={b} className="flex items-start gap-2 text-[13px]"><Check size={16} className="mt-0.5 flex-none text-green-dark dark:text-green-light" /> {b}</li>
            ))}
          </ul>
          {tieneSuscripcion ? (
            <button type="button" disabled={pendiente} onClick={portal} className="mt-6 h-[52px] w-full rounded-[11px] bg-ink font-display text-[17px] font-extrabold text-white dark:bg-white dark:text-ink">
              {pendiente ? 'Abriendo…' : 'Administrar mi suscripción'}
            </button>
          ) : (
            <button type="button" disabled={pendiente || !cobroActivo} onClick={contratar} className="mt-6 h-[52px] w-full rounded-[11px] bg-ink font-display text-[17px] font-extrabold text-white disabled:opacity-90 dark:bg-white dark:text-ink">
              {pendiente ? 'Un momento…' : enPrueba ? 'Quedarme en Plus' : 'Empezar 7 días gratis'}
            </button>
          )}
          <p className="mt-2 text-center text-[11px] text-txt-3">{cobroActivo ? 'Con tarjeta. No se cobra nada durante la prueba; cancela cuando quieras.' : 'El cobro con tarjeta se activa en el lanzamiento. Mientras, tienes Plus completo.'}</p>
        </div>
      </div>
      <div className="flex items-start gap-3 rounded-20 bg-bg-muted p-4 dark:bg-surface-2">
        <ShieldCheck size={22} className="mt-0.5 flex-none text-green-dark dark:text-green-light" />
        <div>
          <div className="font-display text-[14.5px] font-bold">Garantía de 30 días</div>
          <p className="mt-0.5 text-[12.5px] text-txt-2 dark:text-fg-2">Si en tu primer mes de Plus no encuentras un ahorro mayor que lo que cuesta, escríbenos y te devolvemos ese mes. Sin preguntas.</p>
        </div>
      </div>
    </div>
  );
}
