'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import { Logo } from '@/components/shell/Logo';
import { BrandLogo } from '@/components/ui/BrandLogo';

// La "magia" de conectar: los bancos orbitan alrededor de MoneyMaker y los movimientos van cayendo en una lista viva.
// Se usa en la landing (demo) y en Importar (con los datos reales cuando llegan).

export const BANCOS_ORBITA = [
  { nombre: 'BBVA', dominio: 'bbva.mx' },
  { nombre: 'Nu', dominio: 'nu.com.mx' },
  { nombre: 'Amex', dominio: 'americanexpress.com' },
  { nombre: 'Banorte', dominio: 'banorte.com' },
  { nombre: 'Santander', dominio: 'santander.com.mx' },
  { nombre: 'HSBC', dominio: 'hsbc.com.mx' },
  { nombre: 'GBM+', dominio: 'gbm.com' },
  { nombre: 'Bitso', dominio: 'bitso.com' },
];

export type MovimientoDemo = { nombre: string; dominio: string | null; monto: string; detalle: string; abono?: boolean };

export const MOVIMIENTOS_DEMO: MovimientoDemo[] = [
  { nombre: 'Nómina', dominio: null, monto: '+$14,500', detalle: 'Ingreso · Banorte', abono: true },
  { nombre: 'Netflix', dominio: 'netflix.com', monto: '$249', detalle: 'Suscripción · mensual' },
  { nombre: 'Uber', dominio: 'uber.com', monto: '$132', detalle: 'Viaje · Roma Nte → Polanco' },
  { nombre: 'Amazon', dominio: 'amazon.com.mx', monto: '$1,299', detalle: 'Secadora Remington · MSI 1/6' },
  { nombre: 'Oxxo', dominio: 'oxxo.com', monto: '$85', detalle: 'Súper' },
  { nombre: 'Spotify', dominio: 'spotify.com', monto: '$129', detalle: 'Suscripción · mensual' },
  { nombre: 'Rappi', dominio: 'rappi.com.mx', monto: '$248', detalle: 'Comida · Sushi Roll' },
  { nombre: 'CFE', dominio: 'cfe.mx', monto: '$412', detalle: 'Servicio · bimestral' },
  { nombre: 'Liverpool', dominio: 'liverpool.com.mx', monto: '$1,000', detalle: 'MSI 5/12' },
  { nombre: 'Starbucks', dominio: 'starbucks.com.mx', monto: '$98', detalle: 'Café' },
];

type Props = {
  /** Banco al centro de la escena (Importar); sin él, orbitan varios (landing). */
  banco?: { nombre: string; dominio?: string | null } | null;
  /** Movimientos que van apareciendo; por defecto, la demo. */
  movimientos?: MovimientoDemo[];
  /** Milisegundos entre movimientos. */
  ritmo?: number;
  /** true: la escena está "trabajando" (anillos y órbita en movimiento). */
  activa?: boolean;
  /** Etiqueta bajo la escena ("Leyendo el documento…"). */
  etiqueta?: string | null;
  className?: string;
  /** Tema de la escena. */
  tono?: 'oscuro' | 'claro';
};

export function EscenaConexion({ banco = null, movimientos = MOVIMIENTOS_DEMO, ritmo = 900, activa = true, etiqueta = null, className, tono = 'oscuro' }: Props) {
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!activa) return;
    setN(0);
    const id = window.setInterval(() => setN((x) => (x >= movimientos.length ? 1 : x + 1)), ritmo);
    return () => window.clearInterval(id);
  }, [activa, movimientos, ritmo]);

  const visibles = movimientos.slice(Math.max(0, n - 4), n).reverse();
  const oscuro = tono === 'oscuro';

  return (
    <div className={cn('grid items-center gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]', className)}>
      {/* Órbita */}
      <div className="relative mx-auto aspect-square w-full max-w-[380px]">
        <span className={cn('absolute inset-[12%] rounded-full border', oscuro ? 'border-white/10' : 'border-edge')} aria-hidden />
        <span className={cn('absolute inset-[30%] rounded-full border', oscuro ? 'border-white/10' : 'border-edge')} aria-hidden />
        {activa && (
          <>
            <span className={cn('absolute inset-[38%] rounded-full animate-pulse-ring', oscuro ? 'bg-green-light/25' : 'bg-green/15')} aria-hidden />
            <span className={cn('absolute inset-[38%] rounded-full animate-pulse-ring [animation-delay:.8s]', oscuro ? 'bg-green-light/20' : 'bg-green/10')} aria-hidden />
          </>
        )}
        <span className={cn('absolute left-1/2 top-1/2 flex h-[88px] w-[88px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full shadow-green', oscuro ? 'bg-white' : 'bg-ink')}>
          {banco ? <BrandLogo domain={banco.dominio} nombre={banco.nombre} size={72} logoPct={62} bg="transparent" className="text-ink" /> : <Logo size={52} className="rounded-[16px]" />}
        </span>
        <div className={cn('absolute inset-0', activa && 'animate-orbita')} style={{ animationDuration: '28s' }} aria-hidden>
          {(banco ? [{ nombre: 'MoneyMaker', dominio: '' }, ...BANCOS_ORBITA.slice(0, 5)] : BANCOS_ORBITA).map((b, i, arr) => {
            const ang = (i / arr.length) * Math.PI * 2 - Math.PI / 2;
            const r = 44;
            const x = 50 + Math.cos(ang) * r;
            const y = 50 + Math.sin(ang) * r;
            return (
              <span key={b.nombre} className={cn('absolute flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full shadow-card', activa && 'animate-orbita-inversa', oscuro ? 'bg-white' : 'bg-surface')} style={{ left: `${x}%`, top: `${y}%`, animationDuration: '28s' }}>
                {b.nombre === 'MoneyMaker' ? <Logo size={30} /> : <BrandLogo domain={b.dominio} nombre={b.nombre} size={40} logoPct={62} bg="transparent" className="text-ink" />}
              </span>
            );
          })}
        </div>
      </div>

      {/* Lista viva */}
      <div>
        <ul className="space-y-2" aria-live="polite">
          {visibles.map((m, i) => (
            <li key={`${m.nombre}-${n - i}`} className={cn('flex items-center gap-3 rounded-card px-3.5 py-2.5 animate-rise', oscuro ? 'bg-white/[0.07]' : 'bg-surface shadow-card', i > 0 && 'opacity-[.72]', i > 1 && 'opacity-[.48]', i > 2 && 'opacity-[.28]')}>
              <BrandLogo domain={m.dominio} nombre={m.nombre} size={36} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-bold">{m.nombre}</span>
                <span className={cn('block truncate text-[11.5px]', oscuro ? 'text-white/60' : 'text-txt-2')}>{m.detalle}</span>
              </span>
              <span className={cn('font-display text-[14px] font-bold', m.abono && (oscuro ? 'text-green-light' : 'text-green'))}>{m.monto}</span>
            </li>
          ))}
          {visibles.length === 0 && <li className={cn('rounded-card px-3.5 py-2.5 text-[12.5px]', oscuro ? 'bg-white/[0.07] text-white/60' : 'bg-surface text-txt-2 shadow-card')}>Conectando…</li>}
        </ul>
        {etiqueta && <p className={cn('mt-3 text-[12.5px] font-semibold', oscuro ? 'text-green-light' : 'text-green')}>{etiqueta}</p>}
      </div>
    </div>
  );
}
