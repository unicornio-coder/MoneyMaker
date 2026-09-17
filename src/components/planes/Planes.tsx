'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';
import { fechaCorta } from '@/lib/format';

const BENEFICIOS = ['Bancos, tarjetas e inversiones en un solo lugar', 'Presupuesto por quincena que se arma solo', 'Detección de suscripciones y meses sin intereses', 'Cancelación guiada y "Cancelar por mí"', 'Insights cada quincena: cuánto puedes invertir', 'Estados de cuenta ilimitados'];

export function Planes({ plan, trialTermina }: { plan: 'trial' | 'premium' | 'vencido'; trialTermina: string }) {
  const [anual, setAnual] = useState(false);
  return (
    <div className="mx-auto max-w-[720px] space-y-5">
      <div className="text-center">
        <h2 className="font-display text-[26px] font-bold tracking-[-0.8px]">Un solo plan. Todo incluido.</h2>
        <p className="mt-1 text-[13.5px] text-txt-2 dark:text-fg-2">{plan === 'trial' ? `Tu prueba gratis termina el ${fechaCorta(trialTermina)}.` : plan === 'premium' ? 'Eres Premium. Gracias por confiar en MoneyMaker.' : 'Tu prueba terminó. Reactiva tu plan para seguir viendo tu quincena.'}</p>
      </div>
      <div className="mx-auto flex w-fit gap-1 rounded-pill bg-bg-muted p-1 dark:bg-surface-2">
        {[['Mensual', false], ['Anual · 2 meses gratis', true]].map(([l, v]) => (
          <button key={String(l)} type="button" onClick={() => setAnual(v as boolean)} className={cn('h-9 rounded-pill px-4 text-[12.5px] font-semibold transition-colors', anual === v ? 'bg-surface shadow-card' : 'text-txt-2 dark:text-fg-2')}>{l}</button>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className={cn('rounded-20 border-2 p-6', plan !== 'vencido' ? 'border-green bg-green-50 dark:bg-surface-2' : 'border-edge bg-surface')}>
          <div className="text-[12px] font-bold uppercase tracking-[0.9px] text-green">{plan === 'trial' ? 'Tu plan actual · prueba' : 'Premium'}</div>
          <div className="mt-2 font-display text-[40px] font-bold leading-none tracking-[-1.5px]">{anual ? '$2,500' : '$250'}<span className="text-[16px] font-semibold text-txt-2 dark:text-fg-2"> MXN/{anual ? 'año' : 'mes'}</span></div>
          <ul className="mt-5 space-y-2.5">
            {BENEFICIOS.map((b) => (
              <li key={b} className="flex items-start gap-2 text-[13px]"><Check size={16} className="mt-0.5 flex-none text-green" /> {b}</li>
            ))}
          </ul>
          <button type="button" disabled className="mt-6 h-[52px] w-full rounded-[11px] bg-ink font-display text-[17px] font-extrabold text-white disabled:opacity-90 dark:bg-white dark:text-ink">
            {plan === 'premium' ? 'Plan activo' : 'Empezar 7 días gratis'}
          </button>
          <p className="mt-2 text-center text-[11px] text-txt-3">El cobro con tarjeta se activa en el lanzamiento. Mientras, tu prueba sigue activa.</p>
        </div>
        <div className="rounded-20 bg-ink p-6 text-white">
          <div className="text-[12px] font-bold uppercase tracking-[0.9px] text-green-light">Patrimonio · pronto</div>
          <div className="mt-2 font-display text-[22px] font-bold leading-tight">Contabilidad completa de tu patrimonio</div>
          <p className="mt-3 text-[13px] text-white/75">Balance, P&amp;L, inversiones, propiedades y autos con valuación automática, impuestos y un asesor humano. Para quienes ya tienen un patrimonio que cuidar.</p>
          <ul className="mt-4 space-y-2 text-[12.5px] text-white/85">
            {['Todo lo de Premium', 'Valuación de autos e inmuebles', 'Declaración anual asistida', 'Familia: hasta 5 integrantes'].map((b) => (
              <li key={b} className="flex items-start gap-2"><Check size={15} className="mt-0.5 flex-none text-green-light" /> {b}</li>
            ))}
          </ul>
          <button type="button" disabled className="mt-6 h-[52px] w-full rounded-[11px] border border-white/25 font-display text-[15px] font-bold text-white/70">Lista de espera</button>
        </div>
      </div>
    </div>
  );
}
