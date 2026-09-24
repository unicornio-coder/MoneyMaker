import type { LucideIcon } from 'lucide-react';
import { Button } from './Button';

type Props = {
  icon: LucideIcon;
  titulo: string;
  texto: string;
  cta?: { label: string; onClick?: () => void; href?: string };
};

export function EmptyState({ icon: Icon, titulo, texto, cta }: Props) {
  return (
    <div className="card mx-auto flex max-w-[420px] flex-col items-center px-6 py-10 text-center">
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-dark dark:bg-surface-2 dark:text-green-light">
        <Icon size={26} strokeWidth={2} />
      </span>
      <h2 className="font-display text-[17px] font-bold">{titulo}</h2>
      <p className="mt-1.5 text-[13px] leading-relaxed text-txt-2 dark:text-fg-2">{texto}</p>
      {cta &&
        (cta.href ? (
          <a href={cta.href} className="btn-primary mt-5 inline-flex h-11 items-center px-5 text-[13px]">
            {cta.label}
          </a>
        ) : (
          <Button className="mt-5" onClick={cta.onClick}>
            {cta.label}
          </Button>
        ))}
    </div>
  );
}
