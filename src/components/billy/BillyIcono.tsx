import { forwardRef, type SVGProps } from 'react';
import type { LucideIcon } from 'lucide-react';

type Props = Omit<SVGProps<SVGSVGElement>, 'ref'> & { size?: number | string; strokeWidth?: number | string };

/**
 * Versión de línea de la marca de Billy (globo de diálogo con la "B"), con la misma API que los íconos de lucide
 * para usarse en la barra lateral, el buscador y el menú "Más" con el color del texto.
 */
const Icono = forwardRef<SVGSVGElement, Props>(function BillyIcono({ size = 24, strokeWidth = 2, ...props }, ref) {
  return (
    <svg ref={ref} xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <path d="M12 2.5a9.5 9.5 0 1 1 0 19H4.6a2.1 2.1 0 0 1-2.1-2.1V12A9.5 9.5 0 0 1 12 2.5Z" />
      <path d="M9.2 7.6h3.2a2.15 2.15 0 0 1 0 4.3H9.2m0 0h3.9a2.25 2.25 0 0 1 0 4.5H9.2V7.6" />
    </svg>
  );
});

export const BillyIcono = Icono as unknown as LucideIcon;
