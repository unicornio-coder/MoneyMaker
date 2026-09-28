import Link from 'next/link';
import { Crown } from 'lucide-react';
import { cn } from '@/lib/cn';

/** Aviso corto cuando una función es de Plus: el texto del límite y el enlace a Planes. Sin bloquear nada más. */
export function AvisoPlus({ texto, className, oscuro = false }: { texto: string; className?: string; oscuro?: boolean }) {
  return (
    <div className={cn('flex items-start gap-2.5 rounded-card p-3.5 text-[12.5px] leading-relaxed', oscuro ? 'bg-white/10 text-white' : 'bg-green-50 text-ink dark:bg-surface-2 dark:text-fg', className)} role="status">
      <Crown size={16} className={cn('mt-0.5 flex-none', oscuro ? 'text-green-light' : 'text-green-dark dark:text-green-light')} />
      <div>
        <p>{texto}</p>
        <Link href="/app/planes" className={cn('mt-1 inline-block font-bold', oscuro ? 'text-green-light' : 'text-green-dark dark:text-green-light')}>Ver Plus</Link>
      </div>
    </div>
  );
}
