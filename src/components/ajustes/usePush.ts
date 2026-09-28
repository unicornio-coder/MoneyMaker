'use client';

import { useCallback, useEffect, useState } from 'react';

const CLAVE_PUBLICA = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

export type EstadoPush = 'cargando' | 'no_soportado' | 'no_configurado' | 'bloqueado' | 'inactivo' | 'activo';

function aUint8(b64: string): Uint8Array<ArrayBuffer> {
  const base = (b64 + '='.repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(base);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Estado y acciones de los avisos push en este dispositivo (Ajustes → Avisos y la tarjeta "Activa los avisos"). */
export function usePush() {
  const [estado, setEstado] = useState<EstadoPush>('cargando');
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) return vivo && setEstado('no_soportado');
      if (!CLAVE_PUBLICA) return vivo && setEstado('no_configurado');
      if (Notification.permission === 'denied') return vivo && setEstado('bloqueado');
      try {
        const reg = await navigator.serviceWorker.getRegistration('/sw.js');
        const sub = await reg?.pushManager.getSubscription();
        if (vivo) setEstado(sub ? 'activo' : 'inactivo');
      } catch {
        if (vivo) setEstado('inactivo');
      }
    })();
    return () => {
      vivo = false;
    };
  }, []);

  const activar = useCallback(async (): Promise<boolean> => {
    setError(null);
    setOcupado(true);
    try {
      const permiso = await Notification.requestPermission();
      if (permiso !== 'granted') {
        setEstado('bloqueado');
        return false;
      }
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: aUint8(CLAVE_PUBLICA) });
      const res = await fetch('/api/push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sub.toJSON()) });
      if (!res.ok) throw new Error('registro');
      setEstado('activo');
      return true;
    } catch {
      setError('No pudimos activar los avisos en este dispositivo. Intenta de nuevo.');
      return false;
    } finally {
      setOcupado(false);
    }
  }, []);

  const desactivar = useCallback(async () => {
    setError(null);
    setOcupado(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js');
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch('/api/push', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) });
        await sub.unsubscribe();
      }
      setEstado('inactivo');
    } catch {
      setError('No pudimos quitar este dispositivo. Intenta de nuevo.');
    } finally {
      setOcupado(false);
    }
  }, []);

  return { estado, error, ocupado, activar, desactivar };
}
