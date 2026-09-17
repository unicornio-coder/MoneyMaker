'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';

// Cuatro pantallas que rotan cada 3.2 s: presupuesto → alerta de suscripción → cancelada → dinero trabajando.
const PANTALLAS = [
  { titulo: 'Armando tu presupuesto', cuerpo: (
    <div className="space-y-2.5">
      {[['Fijos', 46], ['MSI', 16], ['Ahorro', 20], ['Libre', 18]].map(([l, p]) => (
        <div key={String(l)}><div className="flex justify-between text-[11px] text-white/80"><span>{l}</span><span className="font-bold text-white">{p} %</span></div><div className="mt-1 h-2 rounded-pill bg-white/12"><div className="h-2 rounded-pill bg-green-light transition-[width] duration-[900ms] ease-out" style={{ width: `${p}%` }} /></div></div>
      ))}
    </div>
  ) },
  { titulo: 'Suscripción detectada', cuerpo: (
    <div className="rounded-14 rounded-card bg-white/10 p-3">
      <div className="text-[12.5px] font-bold">HBO Max cobró $149</div>
      <div className="mt-0.5 text-[11px] text-white/70">Llevas 3 meses pagándolo.</div>
      <div className="mt-3 flex h-9 items-center justify-center rounded-pill bg-green-light text-[12px] font-bold text-ink">Cancelar por mí</div>
    </div>
  ) },
  { titulo: 'Suscripción cancelada', cuerpo: (
    <div className="text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-light text-[22px] font-extrabold text-ink">✓</div>
      <div className="mt-2 font-display text-[20px] font-bold">$1,788 al año</div>
      <div className="text-[11px] text-white/70">Invertir los $149 cada mes</div>
    </div>
  ) },
  { titulo: 'Ese dinero, trabajando', cuerpo: (
    <div>
      <div className="text-[11px] text-white/70">CETES en GBM+ · 12 meses</div>
      <div className="font-display text-[24px] font-bold text-green-light">$1,880</div>
      <svg viewBox="0 0 200 60" className="mt-2 h-14 w-full"><path d="M0 55 L30 48 L60 44 L90 38 L120 30 L150 22 L180 14 L200 8" fill="none" stroke="#4ADE80" strokeWidth="3" strokeLinecap="round" /></svg>
    </div>
  ) },
];

export function TelefonoAnimado() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % PANTALLAS.length), 3200);
    return () => clearInterval(t);
  }, []);
  const p = PANTALLAS[i];
  return (
    <div className="relative">
      <div className="w-[280px] rounded-[44px] border-[8px] border-ink bg-ink p-2 shadow-[0_30px_60px_rgba(11,31,23,0.35)]">
        <div className="flex h-[520px] flex-col rounded-[34px] bg-[#0F1412] p-5 text-white">
          <div className="mx-auto mb-5 h-5 w-24 rounded-pill bg-black" />
          <div className="text-[10.5px] font-bold uppercase tracking-[0.9px] text-green-light">MoneyMaker</div>
          <div key={i} className="mt-2 animate-screen">
            <div className="font-display text-[17px] font-bold">{p.titulo}</div>
            <div className="mt-4">{p.cuerpo}</div>
          </div>
          <div className="mt-auto flex justify-center gap-1.5">
            {PANTALLAS.map((_, k) => <span key={k} className={cn('h-1.5 w-1.5 rounded-full transition-colors', k === i ? 'bg-green-light' : 'bg-white/25')} />)}
          </div>
        </div>
      </div>
    </div>
  );
}
