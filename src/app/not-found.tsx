import Link from 'next/link';
import { Compass } from 'lucide-react';

export const metadata = { title: 'Página no encontrada · MoneyMaker' };

export default function NoEncontrada() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg-input px-5 dark:bg-canvas">
      <div className="card w-full max-w-[420px] px-6 py-10 text-center">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-dark dark:bg-surface-2 dark:text-green-light"><Compass size={26} /></span>
        <h1 className="font-display text-[18px] font-bold">Esta página no existe</h1>
        <p className="mt-1.5 text-[13px] text-txt-2 dark:text-fg-2">Puede que el enlace esté mal escrito o que la pantalla haya cambiado de lugar.</p>
        <div className="mt-5 flex justify-center gap-2">
          <Link href="/app" className="btn-primary inline-flex h-11 items-center px-5 text-[13px]">Ir a mi panel</Link>
          <Link href="/" className="inline-flex h-11 items-center rounded-pill border border-line-2 px-5 text-[13px] font-semibold hover:bg-bg-hover dark:border-edge dark:hover:bg-surface-2">Inicio</Link>
        </div>
      </div>
    </div>
  );
}
