import { forwardRef } from 'react';
import { cn } from '@/lib/cn';

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
  icon?: React.ReactNode;
};

export const Input = forwardRef<HTMLInputElement, Props>(function Input({ label, hint, error, icon, className, id, ...rest }, ref) {
  const inputId = id ?? rest.name;
  return (
    <label className="block" htmlFor={inputId}>
      {label && <span className="mb-1.5 block text-[12.5px] font-semibold text-fg">{label}</span>}
      <span className="relative block">
        {icon && <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-txt-3">{icon}</span>}
        <input ref={ref} id={inputId} className={cn('input text-[14px]', icon && 'pl-11', error && 'border-negative', className)} {...rest} />
      </span>
      {error ? <span className="mt-1 block text-[11.5px] text-negative">{error}</span> : hint ? <span className="mt-1 block text-[11.5px] text-txt-2">{hint}</span> : null}
    </label>
  );
});
