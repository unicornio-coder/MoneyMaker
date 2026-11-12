'use client';

import { useState } from 'react';
import { Bitcoin } from 'lucide-react';
import { cn } from '@/lib/cn';
import { money } from '@/lib/format';
import { valorFuturo } from '@/lib/domain/simulador';

const PLAZOS = [1, 3, 5];
// Tres supuestos fijos y simétricos. No son pronósticos: muestran qué pasa si el precio baja, se queda o sube.
const ESCENARIOS = [
  { id: 'baja', etiqueta: 'Si baja 30 % al año', anual: -0.3 },
  { id: 'igual', etiqueta: 'Si se queda igual', anual: 0 },
  { id: 'sube', etiqueta: 'Si sube 30 % al año', anual: 0.3 },
] as const;

/** Simulador: qué pasaría si lo que te sobra cada quincena fuera a criptomonedas. Es una cuenta con supuestos, no una recomendación. */
export function SimuladorCripto({ sobrante }: { sobrante: number | null }) {
  const [aporte, setAporte] = useState(sobrante && sobrante > 0 ? Math.round(sobrante) : 500);
  const [años, setAños] = useState(3);
  const aportado = aporte * años * 24;
  return (
    <section className="card mx-auto mt-6 max-w-[720px] p-5 md:p-6" aria-labelledby="titulo-simulador">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-green-50 text-green-dark dark:bg-surface-2 dark:text-green-light"><Bitcoin size={20} /></span>
        <div>
          <h2 id="titulo-simulador" className="font-display text-[18px] font-bold">Simula invertir lo que te sobra en cripto</h2>
          <p className="text-[12.5px] text-txt-2 dark:text-fg-2">{sobrante && sobrante > 0 ? `Empezamos con lo que te queda de tu quincena: ${money(sobrante)}.` : 'Pon cuánto podrías apartar cada quincena.'}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block" htmlFor="aporte-cripto">
          <span className="mb-1.5 block text-[12.5px] font-semibold">Aportación por quincena</span>
          <input id="aporte-cripto" type="number" inputMode="numeric" min={0} max={1000000} step={50} value={aporte} onChange={(e) => setAporte(Math.max(0, Math.min(1_000_000, Number(e.target.value) || 0)))} className="input h-12 w-full text-[15px] font-bold" />
        </label>
        <div>
          <span className="mb-1.5 block text-[12.5px] font-semibold">Plazo</span>
          <div className="grid grid-cols-3 gap-1 rounded-pill bg-bg-muted p-1 dark:bg-surface-2" role="group" aria-label="Plazo">
            {PLAZOS.map((p) => (
              <button key={p} type="button" aria-pressed={años === p} onClick={() => setAños(p)} className={cn('h-10 rounded-pill text-[13px] font-bold transition-colors', años === p ? 'bg-surface text-fg shadow-card dark:bg-canvas' : 'text-txt-2 dark:text-fg-2')}>{p === 1 ? '1 año' : `${p} años`}</button>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-5 text-[13px] text-txt-2 dark:text-fg-2">En {años === 1 ? '1 año' : `${años} años`} habrías puesto <b className="text-fg">{money(aportado)}</b>. Podrías terminar con:</p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-3">
        {ESCENARIOS.map((e) => {
          const fin = valorFuturo(aporte, años, e.anual);
          const dif = fin - aportado;
          return (
            <li key={e.id} className="rounded-card bg-bg-page px-4 py-3.5 dark:bg-surface-2">
              <div className="text-[11.5px] font-semibold text-txt-2 dark:text-fg-2">{e.etiqueta}</div>
              <div className="mt-1 font-display text-[22px] font-bold leading-none">{money(fin)}</div>
              <div className={cn('mt-1.5 text-[12px] font-semibold', dif < -0.5 ? 'text-negative' : dif > 0.5 ? 'text-green-dark dark:text-green-light' : 'text-txt-3')}>{Math.abs(dif) <= 0.5 ? 'Lo mismo que pusiste' : `${dif > 0 ? '+' : '−'}${money(Math.abs(dif))}`}</div>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-[11.5px] leading-relaxed text-txt-3">Es una simulación con supuestos fijos, no una predicción ni una recomendación. Las criptomonedas cambian de precio muy rápido y puedes perder parte o todo lo invertido; no pongas dinero que vayas a necesitar pronto.</p>
    </section>
  );
}
