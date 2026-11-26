'use client';

import { useId } from 'react';
import { cn } from '@/lib/cn';

type Props = {
  /** Lado en px. */
  size?: number;
  /** Punto de estado (verde claro con aro blanco), para el encabezado del chat. */
  enLinea?: boolean;
  /** Nombre accesible; sin él la marca es decorativa (el nombre ya está escrito al lado). */
  titulo?: string;
  className?: string;
};

/** Globo de diálogo: un círculo con la esquina de abajo a la izquierda en escuadra (la "colita" de quien habla). */
const SILUETA = 'M20 0C31.05 0 40 8.95 40 20S31.05 40 20 40H5.5A5.5 5.5 0 0 1 0 34.5V20C0 8.95 8.95 0 20 0Z';

/**
 * Marca de Billy: monograma "B" de trazo redondo dentro de un globo de diálogo que va de tinta a verde, con una
 * chispa verde claro arriba a la derecha (la parte "viva" del asistente). Solo colores de la paleta; se lee igual a 24 px que a 64.
 */
export function BillyMarca({ size = 40, enLinea = false, titulo, className }: Props) {
  const id = useId().replace(/:/g, '');
  const fondo = `billy-fondo-${id}`;
  const brillo = `billy-brillo-${id}`;
  return (
    <span className={cn('relative inline-flex flex-none', className)} style={{ width: size, height: size }}>
      <svg viewBox="0 0 40 40" width={size} height={size} role={titulo ? 'img' : undefined} aria-label={titulo} aria-hidden={titulo ? undefined : true} focusable="false">
        <defs>
          <linearGradient id={fondo} x1="6" y1="4" x2="36" y2="38" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#0B1F17" />
            <stop offset="0.58" stopColor="#0B1F17" />
            <stop offset="1" stopColor="#16A34A" />
          </linearGradient>
          <radialGradient id={brillo} cx="30" cy="9" r="16" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#4ADE80" stopOpacity="0.32" />
            <stop offset="1" stopColor="#4ADE80" stopOpacity="0" />
          </radialGradient>
        </defs>
        <path d={SILUETA} fill={`url(#${fondo})`} />
        <path d={SILUETA} fill={`url(#${brillo})`} />
        {/* "B": asta y dos panzas de trazo redondo; la de abajo, más ancha, le da el peso de una letra dibujada. */}
        <path
          d="M14 11.6H20A4.2 4.2 0 0 1 20 20H14M14 20H21.5A4.25 4.25 0 0 1 21.5 28.5H14V11.6"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="3.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="28.6" cy="12.2" r="2.6" fill="#4ADE80" />
      </svg>
      {enLinea && <span className="absolute bottom-0 right-0 h-[28%] w-[28%] rounded-full bg-green-light ring-2 ring-white" aria-hidden />}
    </span>
  );
}
