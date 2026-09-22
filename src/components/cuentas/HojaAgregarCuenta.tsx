'use client';

import { useRouter } from 'next/navigation';
import { FileUp, Landmark, Mail, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { TEXTOS } from '@/lib/textos';
import { Panel } from '@/components/ui/Panel';

type Props = { open: boolean; onClose: () => void; bancoSugerido?: string | null };

/** "Agregar cuenta" / "Agregar tarjeta": hoy solo el estado de cuenta en PDF; banco y correo, próximamente. */
export function HojaAgregarCuenta({ open, onClose, bancoSugerido }: Props) {
  const router = useRouter();
  const t = TEXTOS.modal;
  const opciones = [
    { id: 'pdf', icon: FileUp, titulo: t.opciones.pdf.titulo, texto: t.opciones.pdf.texto, activo: true },
    { id: 'banco', icon: Landmark, titulo: t.opciones.banco.titulo, texto: t.opciones.banco.texto, activo: false },
    { id: 'correo', icon: Mail, titulo: t.opciones.correo.titulo, texto: t.opciones.correo.texto, activo: false },
  ];
  const elegir = (id: string) => {
    if (id !== 'pdf') return;
    onClose();
    router.push(bancoSugerido ? `/app/importar?banco=${encodeURIComponent(bancoSugerido)}` : '/app/importar');
  };

  return (
    <Panel open={open} onClose={onClose} mode="modal" title={t.titulo}>
      <ul className="space-y-2 pb-2">
        {opciones.map((o, i) => {
          const Icon = o.icon;
          return (
            <li key={o.id} className="animate-rise" style={{ animationDelay: `${60 + i * 70}ms` }}>
              <button
                type="button"
                disabled={!o.activo}
                aria-disabled={!o.activo}
                onClick={() => elegir(o.id)}
                className={cn('flex w-full items-center gap-3.5 rounded-card border px-4 py-3.5 text-left transition-all', o.activo ? 'border-edge bg-surface hover:border-green hover:shadow-hover' : 'cursor-not-allowed border-edge bg-bg-page opacity-70 dark:bg-surface-2')}
              >
                <span className={cn('flex h-11 w-11 flex-none items-center justify-center rounded-full', o.activo ? 'bg-green text-white' : 'bg-bg-muted text-txt-3 dark:bg-surface-2')}>
                  <Icon size={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-bold">{o.titulo}</span>
                  <span className="block text-[12px] text-txt-2 dark:text-fg-2">{o.texto}</span>
                </span>
                {o.activo ? <ChevronRight size={18} className="text-txt-3" /> : <span className="rounded-pill bg-bg-chip px-2.5 py-1 text-[10.5px] font-bold text-txt-2 dark:bg-surface dark:text-fg-2">Próximamente</span>}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="pb-1 text-center text-[11px] text-txt-3">{TEXTOS.confianza.no_guardamos_pdf} {TEXTOS.confianza.no_pedimos_contraseña_banco}</p>
    </Panel>
  );
}
