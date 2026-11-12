import Link from 'next/link';
import { cn } from '@/lib/cn';

/** Entrar y crear cuenta se sienten como una sola pantalla: dos pestañas arriba del formulario. */
export function AccesoTabs({ activa }: { activa: 'entrar' | 'crear' }) {
  const tabs = [
    { id: 'entrar', href: '/login', label: 'Entrar' },
    { id: 'crear', href: '/registro', label: 'Crear cuenta' },
  ] as const;
  return (
    <nav aria-label="Acceso" className="mb-7 grid grid-cols-2 gap-1 rounded-pill bg-bg-muted p-1 text-[14px] font-bold dark:bg-surface-2">
      {tabs.map((t) => (
        <Link key={t.id} href={t.href} aria-current={activa === t.id ? 'page' : undefined} className={cn('flex h-10 items-center justify-center rounded-pill transition-colors', activa === t.id ? 'bg-surface text-fg shadow-card dark:bg-canvas' : 'text-txt-2 hover:text-fg dark:text-fg-2')}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
