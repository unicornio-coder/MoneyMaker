'use client';

import { cn } from '@/lib/cn';

type Props = {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  /** 'lime' = activo #BEF264 (historial); 'ink' = activo tinta (periodos); 'blue' = activo azul (gastos) */
  tone?: 'lime' | 'ink' | 'blue';
  size?: 'sm' | 'md';
  className?: string;
  /** Dentro de un ChipGroup el chip es una pestaña (role=tab + aria-selected). */
  tab?: boolean;
};

export function Chip({ active, onClick, children, tone = 'ink', size = 'md', className, tab }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      role={tab ? 'tab' : undefined}
      aria-selected={tab ? active : undefined}
      aria-pressed={tab ? undefined : active}
      className={cn(
        'whitespace-nowrap rounded-pill border font-semibold transition-all duration-[180ms] ease-out',
        size === 'md' ? 'px-3.5 py-1.5 text-[12.5px]' : 'px-3 py-1 text-[11px]',
        !active && 'border-line-2 bg-surface text-fg hover:bg-bg-hover dark:border-edge',
        active && tone === 'lime' && 'border-lime bg-lime text-ink',
        active && tone === 'ink' && 'scale-[1.08] border-ink bg-ink text-white dark:border-white dark:bg-white dark:text-ink',
        active && tone === 'blue' && 'border-negative bg-negative text-white',
        className,
      )}
    >
      {children}
    </button>
  );
}

type GroupProps<T extends string> = {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  tone?: Props['tone'];
  size?: Props['size'];
  className?: string;
};

export function ChipGroup<T extends string>({ value, onChange, options, tone, size, className }: GroupProps<T>) {
  return (
    <div className={cn('flex gap-1.5', className)} role="tablist">
      {options.map((o) => (
        <Chip key={o.value} tab active={o.value === value} onClick={() => onChange(o.value)} tone={tone} size={size}>
          {o.label}
        </Chip>
      ))}
    </div>
  );
}
