'use client';

import { useState } from 'react';
import { ArrowRight, CreditCard, Landmark, Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

// Estados de cuenta de prueba (documentos sintéticos, no de un banco real). Un toque los trae y los sube:
// sin descargar y volver a buscar el archivo, que en el teléfono es el paso donde la gente se pierde.
export const EJEMPLOS = [
  { id: 'nomina', archivo: 'ejemplo-debito-nomina.pdf', titulo: 'Cuenta de nómina', detalle: 'Débito · depósitos, súper, servicios', icon: Landmark },
  { id: 'credito', archivo: 'ejemplo-tarjeta-de-credito-1.pdf', titulo: 'Tarjeta de crédito', detalle: 'Suscripciones y meses sin intereses', icon: CreditCard },
] as const;

type Props = {
  /** Recibe el PDF ya convertido en File, listo para leerse. */
  onArchivo: (archivo: File) => void;
  /** Tono del contenedor donde vive (oscuro en hojas de tinta). */
  tono?: 'claro' | 'oscuro';
  disabled?: boolean;
  className?: string;
};

export function EjemplosRapidos({ onArchivo, tono = 'claro', disabled, className }: Props) {
  const [cargando, setCargando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const usar = async (e: (typeof EJEMPLOS)[number]) => {
    setError(null);
    setCargando(e.id);
    try {
      const res = await fetch(`/ejemplos/${e.archivo}`);
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      onArchivo(new File([blob], e.archivo, { type: 'application/pdf' }));
    } catch {
      setError('No pudimos abrir el ejemplo. Intenta de nuevo.');
      setCargando(null);
    }
  };

  return (
    <div className={className} data-testid="ejemplos-rapidos">
      <div className="grid gap-2.5 sm:grid-cols-2">
        {EJEMPLOS.map((e) => {
          const Icon = e.icon;
          const activo = cargando === e.id;
          return (
            <button
              key={e.id}
              type="button"
              disabled={disabled || cargando !== null}
              onClick={() => usar(e)}
              className={cn(
                'group flex items-center gap-3 rounded-card-lg border p-3.5 text-left transition-all duration-200 hover:-translate-y-0.5 disabled:cursor-wait disabled:hover:translate-y-0',
                tono === 'oscuro' ? 'border-white/10 bg-white/5 text-white hover:bg-white/10' : 'border-edge-2 bg-surface hover:border-green hover:shadow-card dark:bg-surface-2',
              )}
            >
              <span className={cn('flex h-10 w-10 flex-none items-center justify-center rounded-full', tono === 'oscuro' ? 'bg-white/10 text-green-light' : 'bg-green-50 text-green-dark dark:bg-surface dark:text-green-light')}>
                {activo ? <Loader2 size={18} className="animate-spin" /> : <Icon size={18} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-bold leading-tight">{e.titulo}</span>
                <span className={cn('block truncate text-[11.5px]', tono === 'oscuro' ? 'text-white/60' : 'text-txt-2 dark:text-fg-2')}>{activo ? 'Abriendo el ejemplo…' : e.detalle}</span>
              </span>
              <ArrowRight size={16} className={cn('flex-none transition-transform group-hover:translate-x-0.5', tono === 'oscuro' ? 'text-white/50' : 'text-txt-3')} />
            </button>
          );
        })}
      </div>
      {error && <p className="mt-2 text-[12.5px] font-semibold text-negative">{error}</p>}
    </div>
  );
}
