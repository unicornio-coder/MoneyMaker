'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { sincronizarTodo } from '@/app/app/acciones';

/** Al abrir la app (una vez por sesión del navegador) pide a las fuentes automáticas los movimientos nuevos. */
export function SyncAlAbrir({ hayFuentes }: { hayFuentes: boolean }) {
  const [estado, setEstado] = useState<'idle' | 'sync' | 'listo'>('idle');
  const [nuevos, setNuevos] = useState(0);
  const router = useRouter();

  useEffect(() => {
    if (!hayFuentes) return;
    let hecho = false;
    try {
      hecho = sessionStorage.getItem('mm-sync') === '1';
    } catch {}
    if (hecho) return;
    setEstado('sync');
    sincronizarTodo()
      .then((r) => {
        try {
          sessionStorage.setItem('mm-sync', '1');
        } catch {}
        setNuevos(r.actualizados);
        setEstado('listo');
        if (r.actualizados > 0) router.refresh();
        setTimeout(() => setEstado('idle'), 4000);
      })
      .catch(() => setEstado('idle'));
  }, [hayFuentes, router]);

  if (estado === 'idle') return null;
  return (
    <div className="pointer-events-none fixed left-1/2 top-[66px] z-30 -translate-x-1/2 animate-rise rounded-pill bg-ink px-3.5 py-1.5 text-[11.5px] font-semibold text-white shadow-dark dark:bg-white dark:text-ink md:top-[62px]">
      <span className="inline-flex items-center gap-1.5">
        <RefreshCw size={12} className={estado === 'sync' ? 'animate-spin' : ''} />
        {estado === 'sync' ? 'Actualizando tus cuentas…' : nuevos > 0 ? `${nuevos} movimientos nuevos` : 'Todo al día'}
      </span>
    </div>
  );
}
