'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { colorDeMarca, fuentesLogo, inicialesDeMarca } from '@/lib/brands';

export type BrandLogoProps = {
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
  /** Forma: círculo (por defecto) o cuadrado redondeado. */
  forma?: 'circulo' | 'cuadro';
  /** Avisa qué fuente terminó mostrándose (para la página de diagnóstico). */
  onFuente?: (fuente: string | null) => void;
};

/**
 * Logo de una marca con cadena de respaldo: local → Brandfetch → Clearbit → favicon → iniciales en color de marca.
 * Nunca muestra un círculo gris anónimo.
 */
export function BrandLogo({ domain, nombre, size = 46, logoPct = 54, className, bg, color, forma = 'circulo', onFuente }: BrandLogoProps) {
  const fuentes = fuentesLogo(domain, size >= 64 ? 256 : 128);
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
  useEffect(() => onFuente?.(src ?? null), [src, onFuente]);

  const fondo = bg ?? (monograma ? (color ?? colorDeMarca(nombre, domain)) : undefined);
  const logo = Math.round((size * logoPct) / 100);

  return (
    <span
      className={cn('relative inline-flex flex-none items-center justify-center overflow-hidden text-fg', forma === 'circulo' ? 'rounded-full' : 'rounded-[22%]', !fondo && 'bg-bg-muted dark:bg-surface-2', monograma && !bg && 'text-white ring-1 ring-inset ring-white/15', className)}
      style={{ width: size, height: size, background: fondo }}
      aria-hidden
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={src} ref={ref} src={src} alt="" width={logo} height={logo} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setI((x) => x + 1)} className="rounded-[20%] object-contain" />
      ) : (
        <span className="font-display font-bold tracking-[0.5px]" style={{ fontSize: size * 0.36 }}>
          {inicialesDeMarca(nombre)}
        </span>
      )}
    </span>
  );
}
