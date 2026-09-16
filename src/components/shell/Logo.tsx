import { cn } from '@/lib/cn';

export function Logo({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn('inline-flex flex-none items-center justify-center rounded-[9px] bg-green font-display font-extrabold text-white', className)}
      style={{ width: size, height: size, fontSize: size * 0.55 }}
      aria-hidden
    >
      M
    </span>
  );
}
