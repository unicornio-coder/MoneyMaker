'use client';

import { useEffect, useState } from 'react';
import { Check, AlertTriangle, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Logo } from '@/components/shell/Logo';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { CountUp } from '@/components/ui/CountUp';
import type { ResultadoConexion } from '@/app/app/acciones';

export type EstadoConexion = 'proceso' | 'listo' | 'error';

type Props = {
  banco: { nombre: string; dominio?: string | null };
  estado: EstadoConexion;
  resultado?: ResultadoConexion | null;
  error?: string | null;
  /** Pasos que se van marcando mientras el servidor trabaja. */
  pasos?: string[];
  titulo?: string;
  ctaListo?: string;
  onCerrar: () => void;
  onListo: () => void;
  onReintentar?: () => void;
};

const PASOS_BANCO = ['Verificando acceso seguro', 'Descargando tus cuentas', 'Leyendo 12 meses de movimientos', 'Detectando suscripciones y meses sin intereses', 'Armando tu quincena'];

/** Pantalla de progreso mientras conectamos una fuente: enlace animado banco ↔ MoneyMaker, pasos y resultado con cifras. */
export function ConectandoBanco({ banco, estado, resultado, error, pasos = PASOS_BANCO, titulo, ctaListo = 'Ver mi panel', onCerrar, onListo, onReintentar }: Props) {
  const [paso, setPaso] = useState(0);
  const [mostrarListo, setMostrarListo] = useState(false);

  // En proceso: un paso cada ~1.1 s hasta el penúltimo. Al llegar el resultado, cierra los pasos que falten rápido y luego muestra las cifras.
  useEffect(() => {
    if (estado === 'proceso') {
      setPaso(0);
      setMostrarListo(false);
      const t = window.setInterval(() => setPaso((p) => Math.min(pasos.length - 1, p + 1)), 1100);
      return () => window.clearInterval(t);
    }
    if (estado === 'listo') {
      const t = window.setInterval(() => {
        setPaso((p) => {
          if (p >= pasos.length) {
            window.clearInterval(t);
            window.setTimeout(() => setMostrarListo(true), 350);
            return p;
          }
          return p + 1;
        });
      }, 320);
      return () => window.clearInterval(t);
    }
  }, [estado, pasos.length]);

  const hechos = Math.min(pasos.length, paso);
  const progreso = mostrarListo ? 100 : Math.round(((Math.min(paso, pasos.length - 0.5) + 0.5) / pasos.length) * 100);
  const vista: EstadoConexion = estado === 'listo' && !mostrarListo ? 'proceso' : estado;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/70 p-4 backdrop-blur-sm animate-fade" role="dialog" aria-modal="true" aria-live="polite">
      <div className="w-full max-w-[440px] overflow-hidden rounded-card-xl bg-ink text-white shadow-dark animate-modal">
        <div className="px-6 pb-6 pt-8">
          {/* Enlace animado */}
          <div className="mx-auto flex w-[260px] items-center justify-between">
            <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
              <Logo size={36} className="rounded-[11px]" />
            </span>
            <span className="relative mx-3 h-[2px] flex-1 overflow-hidden rounded-pill bg-white/15">
              {vista === 'proceso' && (
                <>
                  <span className="absolute inset-y-0 left-0 w-1/3 rounded-pill bg-green-light animate-travel" />
                  <span className="absolute inset-y-0 left-0 w-1/3 rounded-pill bg-green-light/60 animate-travel [animation-delay:.5s]" />
                </>
              )}
              {vista === 'listo' && <span className="absolute inset-0 rounded-pill bg-green-light" />}
            </span>
            <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white">
              {vista === 'proceso' && (
                <>
                  <span className="absolute inset-0 rounded-full bg-green-light/40 animate-pulse-ring" />
                  <span className="absolute inset-0 rounded-full bg-green-light/30 animate-pulse-ring [animation-delay:.8s]" />
                </>
              )}
              <Avatar domain={banco.dominio} nombre={banco.nombre} size={56} logoPct={62} bg="transparent" className="relative text-ink" />
            </span>
          </div>

          {vista === 'error' ? (
            <div className="mt-6 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white animate-pop"><AlertTriangle size={24} /></span>
              <h3 className="mt-3 font-display text-[20px] font-bold tracking-[-0.4px]">No pudimos conectar {banco.nombre}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-white/70">{error ?? 'Intenta de nuevo en un momento.'}</p>
              <div className="mt-6 flex gap-2">
                {onReintentar && <Button variant="white" size="lg" className="flex-1" onClick={onReintentar}>Reintentar</Button>}
                <Button variant="outline" size="lg" className={cn('border-white/20 bg-transparent text-white hover:bg-white/10', onReintentar ? 'flex-1' : 'w-full')} onClick={onCerrar}>Cerrar</Button>
              </div>
            </div>
          ) : vista === 'listo' ? (
            <div className="mt-6 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-light text-ink animate-pop"><Check size={30} strokeWidth={3} /></span>
              <h3 className="mt-3 font-display text-[22px] font-bold tracking-[-0.5px]">{banco.nombre} conectado</h3>
              <p className="mt-1 text-[13px] text-white/70">Ya está en tu panel y se actualiza solo.</p>
              <div className="mt-5 grid grid-cols-3 gap-2">
                {[
                  ['Cuentas', resultado?.cuentas ?? 0],
                  ['Movimientos', resultado?.movimientos ?? 0],
                  ['Suscripciones', resultado?.suscripciones ?? 0],
                ].map(([l, v], i) => (
                  <div key={String(l)} className="rounded-card bg-white/8 px-2 py-3 animate-rise" style={{ animationDelay: `${120 + i * 90}ms` }}>
                    <div className="font-display text-[24px] font-bold leading-none tracking-[-0.6px]"><CountUp value={Number(v)} /></div>
                    <div className="mt-1 text-[10.5px] font-semibold text-white/60">{l}</div>
                  </div>
                ))}
              </div>
              <Button variant="white" size="lg" full className="mt-6" onClick={onListo}>{ctaListo}</Button>
            </div>
          ) : (
            <div className="mt-6">
              <h3 className="text-center font-display text-[20px] font-bold tracking-[-0.4px]">{titulo ?? `Conectando con ${banco.nombre}`}</h3>
              <p className="mt-1 text-center text-[12.5px] text-white/60">Esto toma menos de un minuto.</p>
              <div className="mt-5 h-1.5 overflow-hidden rounded-pill bg-white/12">
                <div className="h-full rounded-pill bg-green-light transition-[width] duration-700 ease-out" style={{ width: `${progreso}%` }} />
              </div>
              <ul className="mt-5 space-y-2.5">
                {pasos.map((p, i) => {
                  const hecho = i < hechos;
                  const activo = i === hechos;
                  return (
                    <li key={p} className={cn('flex items-center gap-3 text-[13px] transition-colors duration-300', hecho ? 'text-white' : activo ? 'text-white' : 'text-white/40')}>
                      <span className={cn('flex h-6 w-6 flex-none items-center justify-center rounded-full transition-colors duration-300', hecho ? 'bg-green-light text-ink' : activo ? 'bg-white/15' : 'bg-white/8')}>
                        {hecho ? <Check size={13} strokeWidth={3} className="animate-pop" /> : activo ? <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-green-light animate-spin-slow" /> : <span className="h-1.5 w-1.5 rounded-full bg-white/30" />}
                      </span>
                      <span className={cn(activo && 'font-semibold')}>{p}</span>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-white/50"><ShieldCheck size={13} /> Solo lectura. Nunca guardamos tus claves bancarias.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
