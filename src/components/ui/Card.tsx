import { cn } from '@/lib/cn';

type Props = React.HTMLAttributes<HTMLDivElement> & {
  /** 'card' 14 · 'lg' 18 · 'xl' 24 · 'dark' tinta con texto blanco */
  variant?: 'card' | 'lg' | 'xl' | 'dark' | 'outline';
  padding?: 'none' | 'sm' | 'md' | 'lg';
};

export function Card({ variant = 'card', padding = 'md', className, ...rest }: Props) {
  return (
    <div
      className={cn(
        'transition-shadow duration-[180ms] ease-out',
        variant === 'card' && 'card',
        variant === 'lg' && 'card rounded-card-lg',
        variant === 'xl' && 'card rounded-card-xl',
        variant === 'dark' && 'rounded-16 bg-ink text-white shadow-dark',
        variant === 'outline' && 'rounded-16 border border-edge bg-surface',
        padding === 'sm' && 'p-3.5',
        padding === 'md' && 'px-[18px] py-[17px]',
        padding === 'lg' && 'p-6',
        className,
      )}
      {...rest}
    />
  );
}
