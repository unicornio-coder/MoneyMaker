'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

/** Error de servidor fuera de /app (landing, login, onboarding). Mensaje en español y reintento. */
export default function ErrorRaiz({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[error raíz]', error.digest, error.message);
  }, [error]);
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg-input px-5 dark:bg-canvas">
      <div className="card w-full max-w-[420px] px-6 py-10 text-center">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-warning-soft text-warning"><AlertTriangle size={26} /></span>
        <h2 className="font-display text-[17px] font-bold">Algo no cargó</h2>
        <p className="mt-1.5 text-[13px] text-txt-2 dark:text-fg-2">Fue un error al preparar esta pantalla. Intenta de nuevo; si sigue, avísanos con la referencia.</p>
        {error.digest && <p className="mt-2 text-[10.5px] text-txt-3">Ref. {error.digest}</p>}
        <div className="mt-5 flex justify-center gap-2">
          <Button onClick={reset}>Reintentar</Button>
          <Button variant="outline" onClick={() => (window.location.href = '/app')}>Ir al panel</Button>
        </div>
      </div>
    </div>
  );
}
