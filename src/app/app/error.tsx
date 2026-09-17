'use client';

import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function ErrorApp({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="card mx-auto mt-10 max-w-[420px] px-6 py-10 text-center">
      <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-warning-soft text-warning"><AlertTriangle size={26} /></span>
      <h2 className="font-display text-[17px] font-bold">Algo no cargó</h2>
      <p className="mt-1.5 text-[13px] text-txt-2 dark:text-fg-2">Tus datos están bien; fue un error al mostrar esta pantalla. Intenta de nuevo.</p>
      {error.digest && <p className="mt-2 text-[10.5px] text-txt-3">Ref. {error.digest}</p>}
      <Button className="mt-5" onClick={reset}>Reintentar</Button>
    </div>
  );
}
