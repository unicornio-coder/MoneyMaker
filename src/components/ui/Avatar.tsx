'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { iniciales } from '@/lib/format';
import { colorDeMarca, fuentesLogo } from '@/lib/logos';

type Props = {
  /** Dominio del comercio o banco; de ahí sale el logo. */
  domain?: string | null;
  /** Nombre para el monograma de respaldo. */
  nombre: string;
  size?: number;
  /** Porcentaje del círculo que ocupa el logo. */
  logoPct?: number;
  className?: string;
  /** Fondo forzado (p. ej. 'transparent' sobre un plástico). */
  bg?: string;
  /** Color del monograma; por defecto el de la marca. */
  color?: string | null;
};

/** Círculo con el logo de la marca. Prueba varias fuentes; si ninguna carga, monograma en color de marca. */
export function Avatar({ domain, nombre, size = 46, logoPct = 54, className, bg, color }: Props) {
  const fuentes = fuentesLogo(domain);
  const [i, setI] = useState(0);
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => setI(0), [domain]);
  // Si la imagen falló antes de hidratar, onError nunca dispara: lo revisamos al montar.
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setI((x) => x + 1);
  }, [domain, i]);

  const src = fuentes[i];
  const monograma = !src;
  const fondo = bg ?? (monograma ? (color ?? colorDeMarca(nombre, domain)) : undefined);
  const logo = Math.round((size * logoPct) / 100);

  return (
    <span
      className={cn('relative inline-flex flex-none items-center justify-center overflow-hidden rounded-full text-fg', !fondo && 'bg-bg-muted dark:bg-surface-2', monograma && !bg && 'text-white ring-1 ring-inset ring-white/15', className)}
      style={{ width: size, height: size, background: fondo }}
      aria-hidden
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={src} ref={ref} src={src} alt="" width={logo} height={logo} loading="lazy" decoding="async" onError={() => setI((x) => x + 1)} className="rounded-[20%] object-contain" />
      ) : (
        <span className="font-display font-bold tracking-[0.5px]" style={{ fontSize: size * 0.36 }}>
          {iniciales(nombre)}
        </span>
      )}
    </span>
  );
}
