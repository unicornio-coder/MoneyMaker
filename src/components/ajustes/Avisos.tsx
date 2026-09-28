'use client';

import { useEffect, useState, useTransition } from 'react';
import { BellRing, Smartphone } from 'lucide-react';
import { cn } from '@/lib/cn';
import { guardarAvisos } from '@/app/app/ajustes/acciones';
import { AvisoPlus } from '@/components/planes/AvisoPlus';
import type { Nivel } from '@/lib/domain/plan';

const CLAVE_PUBLICA = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

function aUint8(b64: string): Uint8Array<ArrayBuffer> {
  const base = (b64 + '='.repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(base);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

type EstadoPush = 'cargando' | 'no_soportado' | 'no_configurado' | 'bloqueado' | 'inactivo' | 'activo';

function Interruptor({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <li className="flex min-h-14 items-center gap-3 py-2">
      <span className="flex-1 text-[13px]">{label}</span>
      <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className={cn('relative h-7 w-12 flex-none rounded-pill transition-colors', on ? 'bg-green' : 'bg-line-dashed dark:bg-surface-2')}>
        <span className={cn('absolute top-1 h-5 w-5 rounded-full bg-white transition-all', on ? 'left-6' : 'left-1')} />
      </button>
    </li>
  );
}

/** Avisos reales: resumen del domingo (correo) y cobros próximos (push en este dispositivo). Ambos son de Plus. */
export function Avisos({ resumenDomingo, avisosCobros, nivel }: { resumenDomingo: boolean; avisosCobros: boolean; nivel: Nivel }) {
  const [resumen, setResumen] = useState(resumenDomingo);
  const [cobros, setCobros] = useState(avisosCobros);
  const [push, setPush] = useState<EstadoPush>('cargando');
  const [error, setError] = useState<string | null>(null);
  const [pendiente, start] = useTransition();

  useEffect(() => {
    let vivo = true;
    (async () => {
      if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) return vivo && setPush('no_soportado');
      if (!CLAVE_PUBLICA) return vivo && setPush('no_configurado');
      if (Notification.permission === 'denied') return vivo && setPush('bloqueado');
      try {
        const reg = await navigator.serviceWorker.getRegistration('/sw.js');
        const sub = await reg?.pushManager.getSubscription();
        if (vivo) setPush(sub ? 'activo' : 'inactivo');
      } catch {
        if (vivo) setPush('inactivo');
      }
    })();
    return () => {
      vivo = false;
    };
  }, []);

  const guardar = (c: { resumenDomingo?: boolean; avisosCobros?: boolean }) =>
    start(async () => {
      const r = await guardarAvisos(c);
      if (!r.ok) setError(r.error);
    });

  const activar = () =>
    start(async () => {
      setError(null);
      try {
        const permiso = await Notification.requestPermission();
        if (permiso !== 'granted') return setPush('bloqueado');
        const reg = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: aUint8(CLAVE_PUBLICA) });
        const res = await fetch('/api/push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sub.toJSON()) });
        if (!res.ok) throw new Error('registro');
        setPush('activo');
        if (!cobros) {
          setCobros(true);
          await guardarAvisos({ avisosCobros: true });
        }
      } catch {
        setError('No pudimos activar los avisos en este dispositivo. Intenta de nuevo.');
      }
    });

  const desactivar = () =>
    start(async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration('/sw.js');
        const sub = await reg?.pushManager.getSubscription();
        if (sub) {
          await fetch('/api/push', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) });
          await sub.unsubscribe();
        }
        setPush('inactivo');
      } catch {
        setError('No pudimos quitar este dispositivo. Intenta de nuevo.');
      }
    });

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <h2 className="font-display text-[18px] font-bold">Avisos</h2>
        <p className="mt-1 text-[12.5px] text-txt-2 dark:text-fg-2">Por correo cada domingo y en tu teléfono antes de cada cobro fijo.</p>
        {nivel !== 'plus' && <AvisoPlus className="mt-3" texto="El resumen del domingo y los avisos de cobros son de Plus." />}
        <ul className="mt-3 divide-y divide-edge">
          <Interruptor label="Resumen de la semana por correo, cada domingo a las 8:00" on={resumen} onChange={(v) => { setResumen(v); guardar({ resumenDomingo: v }); }} />
          <Interruptor label="Aviso un día y tres días antes de cada cargo fijo" on={cobros} onChange={(v) => { setCobros(v); guardar({ avisosCobros: v }); }} />
        </ul>
        {error && <p className="mt-2 text-[12.5px] font-semibold text-negative">{error}</p>}
      </div>
      <div className="card p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-bg-muted dark:bg-surface-2"><Smartphone size={18} /></span>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-[15px] font-bold">Avisos en este dispositivo</h3>
            <p className="mt-0.5 text-[12.5px] text-txt-2 dark:text-fg-2">
              {push === 'cargando' && 'Revisando…'}
              {push === 'no_soportado' && 'Este navegador no admite avisos. En Android, instala MoneyMaker desde Chrome (menú → Agregar a pantalla de inicio) y actívalos ahí.'}
              {push === 'no_configurado' && 'Los avisos en el teléfono se activan en el lanzamiento.'}
              {push === 'bloqueado' && 'Bloqueaste los avisos para este sitio. Actívalos en la configuración del navegador y vuelve aquí.'}
              {push === 'inactivo' && 'Recibe un aviso antes de cada cobro fijo, aunque la app esté cerrada.'}
              {push === 'activo' && 'Activados en este dispositivo.'}
            </p>
            {(push === 'inactivo' || push === 'activo') && (
              <button type="button" disabled={pendiente} onClick={push === 'activo' ? desactivar : activar} className={cn('mt-3 inline-flex h-10 items-center gap-2 rounded-[11px] px-4 text-[13px] font-bold', push === 'activo' ? 'border border-edge text-fg' : 'bg-ink text-white dark:bg-white dark:text-ink')} data-testid="activar-push">
                <BellRing size={15} /> {pendiente ? 'Un momento…' : push === 'activo' ? 'Quitar este dispositivo' : 'Activar avisos aquí'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
