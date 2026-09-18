'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { favicon, iniciales } from '@/lib/format';

type Props = {
  /** Dominio del comercio/banco para el favicon (prototipo). */
  domain?: string | null;
  /** Nombre para iniciales de respaldo. */
  nombre: string;
  size?: number;
  /** Porcentaje del círculo que ocupa el logo. */
  logoPct?: number;
  className?: string;
  bg?: string;
};

/** Círculo gris con logo; si el logo no carga, iniciales. */
export function Avatar({ domain, nombre, size = 46, logoPct = 54, className, bg }: Props) {
  const [fallo, setFallo] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  // Si la imagen falló antes de hidratar, onError nunca dispara: lo revisamos al montar.
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setFallo(true);
  }, [domain]);
  const mostrarLogo = domain && !fallo;
  return (
    <span
      className={cn('relative inline-flex flex-none items-center justify-center overflow-hidden rounded-full bg-bg-muted text-fg dark:bg-surface-2', className)}
      style={{ width: size, height: size, background: bg }}
      aria-hidden
    >
      {mostrarLogo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={ref}
          src={favicon(domain, 128)}
          alt=""
          width={Math.round((size * logoPct) / 100)}
          height={Math.round((size * logoPct) / 100)}
          onError={() => setFallo(true)}
          className="rounded-[20%] object-contain"
        />
      ) : (
        <span className="font-display font-bold" style={{ fontSize: size * 0.34 }}>
          {iniciales(nombre)}
        </span>
      )}
    </span>
  );
}
