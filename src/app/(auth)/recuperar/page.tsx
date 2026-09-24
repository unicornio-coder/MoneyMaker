import Link from 'next/link';
import { RecuperarForm } from '@/components/auth/RecuperarForm';

export const metadata = { title: 'Recuperar contraseña · MoneyMaker' };

export default function RecuperarPage() {
  return (
    <div className="animate-screen">
      <h1 className="font-display text-[32px] font-bold leading-tight tracking-[-1px]">Recuperar contraseña</h1>
      <p className="mt-1.5 text-[14px] text-txt-2 dark:text-fg-2">Te mandamos un enlace a tu correo.</p>
      <RecuperarForm />
      <p className="mt-8 text-center text-[13px] text-txt-2 dark:text-fg-2">
        <Link href="/login" className="font-semibold text-green-dark dark:text-green-light underline-offset-4 hover:underline">Volver a entrar</Link>
      </p>
    </div>
  );
}
