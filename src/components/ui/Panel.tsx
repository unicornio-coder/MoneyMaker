'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

type Props = {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  /** 'drawer' = panel derecho 420 px en web, hoja completa en móvil. 'sheet' = hoja inferior siempre. 'modal' = centrado. */
  mode?: 'drawer' | 'sheet' | 'modal';
  /** Fondo del panel (para drawers del color del cuadro). */
  dark?: boolean;
  className?: string;
};

/** Overlay + contenedor con animación. Cierra con × u overlay o Escape. */
export function Panel({ open, onClose, title, children, mode = 'drawer', dark, className }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <button type="button" aria-label="Cerrar" onClick={onClose} className="absolute inset-0 animate-fade bg-ink/45 backdrop-blur-[2px]" />
      <div
        className={cn(
          'absolute flex flex-col overflow-hidden',
          dark ? 'bg-ink text-white' : 'bg-surface text-fg',
          mode === 'drawer' && 'inset-x-0 bottom-0 max-h-[92dvh] animate-sheet rounded-t-sheet md:inset-y-0 md:left-auto md:right-0 md:w-[420px] md:max-h-none md:animate-drawer md:rounded-none',
          mode === 'sheet' && 'inset-x-0 bottom-0 max-h-[92dvh] animate-sheet rounded-t-sheet',
          mode === 'modal' && 'inset-x-3.5 top-1/2 max-h-[88dvh] -translate-y-1/2 animate-modal rounded-card-xl shadow-dark md:left-1/2 md:right-auto md:w-[520px] md:-translate-x-1/2',
          className,
        )}
      >
        {(title !== undefined || mode !== 'sheet') && (
          <div className="flex flex-none items-center gap-3 px-5 pb-3 pt-4">
            <div className="min-w-0 flex-1 font-display text-[16px] font-bold">{title}</div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className={cn('flex h-9 w-9 flex-none items-center justify-center rounded-full', dark ? 'bg-white/12 hover:bg-white/20' : 'bg-bg-muted hover:bg-line dark:bg-surface-2')}
            >
              <X size={18} />
            </button>
          </div>
        )}
        {mode === 'sheet' && title === undefined && (
          <div className="mx-auto mt-2.5 h-1 w-10 flex-none rounded-pill bg-line-handle" />
        )}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-[max(20px,env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </div>
  );
}
