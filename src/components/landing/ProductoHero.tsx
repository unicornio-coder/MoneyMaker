'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import { CountUp } from '@/components/ui/CountUp';
import { BrandLogo } from '@/components/ui/BrandLogo';

// El producto como protagonista: la pantalla de Inicio, animada, dentro de un teléfono grande.
// Números que suben, pastillas de quincena que crecen y el historial que aparece. Sin texto de relleno.

const QUINCENAS = [
  { etiqueta: 'Q1 ago', ingreso: 72, gasto: 58 },
  { etiqueta: 'Q2 ago', ingreso: 72, gasto: 66 },
  { etiqueta: 'Q1 sep', ingreso: 72, gasto: 49 },
  { etiqueta: 'Q2 sep', ingreso: 72, gasto: 31, activa: true },
];

const MOVS = [
  { nombre: 'Nómina', dominio: null, cat: 'Ingreso', monto: '+$14,500', abono: true },
  { nombre: 'Netflix', dominio: 'netflix.com', cat: 'Suscripción', monto: '$249' },
  { nombre: 'Uber', dominio: 'uber.com', cat: 'Transporte', monto: '$132' },
  { nombre: 'Amazon', dominio: 'amazon.com.mx', cat: 'MSI 1/6', monto: '$1,299' },
];

export function ProductoHero({ className }: { className?: string }) {
  const [listo, setListo] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setListo(true), 250);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className={cn('relative mx-auto w-[300px] md:w-[340px]', className)}>
      <div className="pointer-events-none absolute -inset-10 rounded-full bg-green/25 blur-[70px]" aria-hidden />
      <div className="relative rounded-[46px] border-[8px] border-[#0f1412] bg-[#0f1412] p-2 shadow-[0_40px_90px_rgba(11,31,23,0.45)]">
        <div className="overflow-hidden rounded-[36px] bg-canvas text-fg" style={{ height: 640 }}>
          <div className="mx-auto mt-3 h-5 w-24 rounded-pill bg-[#0f1412]" />
          <div className="px-4 pt-4">
            <div className="flex items-center justify-between">
              <div className="font-display text-[16px] font-bold">Buenos días, Ana</div>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink font-display text-[11px] font-bold text-white">A</span>
            </div>

            <div className="mt-4 rounded-card-lg bg-surface p-4 shadow-card">
              <div className="text-[11px] font-semibold text-txt-2">Puedes invertir esta quincena</div>
              <div className="mt-0.5 font-display text-[34px] font-bold leading-none tracking-[-1.4px] text-green">{listo ? <CountUp value={3150} format={(n) => `$${n.toLocaleString('es-MX')}`} duration={1400} /> : '$0'}</div>
              <div className="mt-1 text-[11px] text-txt-2">Ingreso $14,500 − fijos, MSI y gasto habitual</div>
              <div className="mt-4 grid grid-cols-4 items-end gap-2">
                {QUINCENAS.map((q, i) => (
                  <div key={q.etiqueta} className="flex flex-col items-center gap-1.5">
                    <div className="relative h-[92px] w-5 overflow-hidden rounded-pill bg-bg-muted">
                      <div className={cn('absolute bottom-0 w-full origin-bottom rounded-pill transition-transform duration-[900ms] ease-out', q.activa ? 'bg-green-light' : 'bg-green-100')} style={{ height: `${q.ingreso}%`, transform: listo ? 'scaleY(1)' : 'scaleY(0)', transitionDelay: `${300 + i * 120}ms` }} />
                      <div className={cn('absolute bottom-0 w-full origin-bottom rounded-pill transition-transform duration-[900ms] ease-out', q.activa ? 'bg-ink' : 'bg-txt-3/60')} style={{ height: `${q.gasto}%`, transform: listo ? 'scaleY(1)' : 'scaleY(0)', transitionDelay: `${450 + i * 120}ms` }} />
                    </div>
                    <span className={cn('text-[9.5px] font-semibold', q.activa ? 'rounded-pill bg-ink px-1.5 py-0.5 text-white' : 'text-txt-3')}>{q.etiqueta}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-3 flex gap-2">
              {[['BBVA', 'bbva.mx', '#072146'], ['Nu', 'nu.com.mx', '#820AD1'], ['Amex', 'americanexpress.com', '#006FCF']].map(([n, d, c], i) => (
                <div key={n} className="flex h-[58px] flex-1 flex-col justify-between rounded-[12px] p-2 text-white transition-all duration-700" style={{ background: `linear-gradient(135deg, ${c} 0%, ${c} 60%, rgba(255,255,255,0.25) 100%)`, opacity: listo ? 1 : 0, transform: listo ? 'translateY(0)' : 'translateY(10px)', transitionDelay: `${700 + i * 100}ms` }}>
                  <div className="flex items-center justify-between"><span className="text-[9px] font-bold">{n}</span><span className="flex h-4 w-4 items-center justify-center rounded-full bg-white"><BrandLogo domain={d} nombre={n} size={14} logoPct={70} bg="transparent" className="text-ink" /></span></div>
                  <span className="font-display text-[9px] font-extrabold tracking-[2px]">•••• {['0001', '4421', '1007'][i]}</span>
                </div>
              ))}
            </div>

            <div className="mt-3 rounded-card-lg bg-surface p-2 shadow-card">
              {MOVS.map((m, i) => (
                <div key={m.nombre} className="flex items-center gap-2.5 px-2 py-2 transition-all duration-500" style={{ opacity: listo ? 1 : 0, transform: listo ? 'translateX(0)' : 'translateX(12px)', transitionDelay: `${1000 + i * 110}ms` }}>
                  <BrandLogo domain={m.dominio} nombre={m.nombre} size={30} />
                  <span className="min-w-0 flex-1"><span className="block truncate text-[12px] font-bold">{m.nombre}</span><span className="block text-[10px] text-txt-2">{m.cat}</span></span>
                  <span className={cn('font-display text-[12px] font-bold', m.abono && 'text-green')}>{m.monto}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
