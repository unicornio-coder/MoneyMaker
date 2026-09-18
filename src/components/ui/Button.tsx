import { cn } from '@/lib/cn';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'green' | 'ghost' | 'outline' | 'white';
  size?: 'sm' | 'md' | 'lg';
  full?: boolean;
};

export function Button({ variant = 'primary', size = 'md', full, className, type = 'button', ...rest }: Props) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-[180ms] ease-out active:scale-[.98] disabled:cursor-not-allowed disabled:active:scale-100',
        size === 'sm' && 'h-8 rounded-pill px-4 text-[11px]',
        size === 'md' && 'h-11 rounded-pill px-5 text-[13px]',
        size === 'lg' && 'h-[50px] rounded-[14px] px-6 text-[14px] font-bold',
        variant === 'primary' && 'btn-primary',
        variant === 'green' && 'bg-green text-white shadow-green hover:bg-green-dark disabled:bg-line-dashed disabled:shadow-none',
        variant === 'ghost' && 'bg-transparent text-fg hover:bg-bg-hover dark:hover:bg-surface',
        variant === 'outline' && 'border border-line-2 bg-surface text-fg hover:bg-bg-hover dark:border-edge',
        variant === 'white' && 'bg-white text-ink hover:bg-green-50',
        full && 'w-full',
        className,
      )}
      {...rest}
    />
  );
}
