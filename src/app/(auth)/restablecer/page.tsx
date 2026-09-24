import { RestablecerForm } from '@/components/auth/RecuperarForm';

export const metadata = { title: 'Nueva contraseña · MoneyMaker' };

export default function RestablecerPage() {
  return (
    <div className="animate-screen">
      <h1 className="font-display text-[32px] font-bold leading-tight tracking-[-1px]">Nueva contraseña</h1>
      <p className="mt-1.5 text-[14px] text-txt-2 dark:text-fg-2">Elige una que no uses en otro lugar.</p>
      <RestablecerForm />
    </div>
  );
}
