'use client';

import { cn } from '@/lib/cn';
import { money } from '@/lib/format';
import { useUI } from '@/lib/store/ui';

type Props = {
  value: number;
  className?: string;
  /** Verde para ingresos, azul para deuda/negativo, tinta por defecto. */
  tone?: 'ink' | 'green' | 'blue' | 'inherit';
  /** Muestra el signo + en positivos. */
  signed?: boolean;
  /** Re-anima al cambiar el valor. */
  animate?: boolean;
};

export function Money({ value, className, tone = 'inherit', signed, animate }: Props) {
  const ocultar = useUI((s) => s.ocultarSaldos);
  const texto = ocultar ? '$••••' : `${signed && value > 0 ? '+' : ''}${money(value)}`;
  return (
    <span
      key={animate ? texto : undefined}
      className={cn(
        'font-display tabular-nums',
        tone === 'ink' && 'text-fg',
        tone === 'green' && 'text-green',
        tone === 'blue' && 'text-negative',
        animate && 'animate-rise',
        className,
      )}
    >
      {texto}
    </span>
  );
}
