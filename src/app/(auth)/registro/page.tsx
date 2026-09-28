import { CorreoForm } from '@/components/auth/CorreoForm';

export const metadata = { title: 'Crear cuenta · MoneyMaker' };

export default function RegistroPage() {
  return (
    <div className="animate-screen">
      <h1 className="font-display text-[32px] font-bold leading-tight tracking-[-1px]">Crea tu cuenta</h1>
      <p className="mt-1.5 text-[14px] text-txt-2 dark:text-fg-2">Solo tu correo. 7 días de Plus gratis, sin tarjeta.</p>
      <CorreoForm next="/onboarding" />
    </div>
  );
}
