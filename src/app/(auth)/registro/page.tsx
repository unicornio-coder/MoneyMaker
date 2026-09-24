import Link from 'next/link';
import { RegistroForm } from '@/components/auth/RegistroForm';

export const metadata = { title: 'Crear cuenta · MoneyMaker' };

export default function RegistroPage({ searchParams }: { searchParams: { email?: string } }) {
  return (
    <div className="animate-screen">
      <h1 className="font-display text-[32px] font-bold leading-tight tracking-[-1px]">Crear cuenta</h1>
      <p className="mt-1.5 text-[14px] text-txt-2 dark:text-fg-2">7 días gratis. Sin tarjeta.</p>
      <RegistroForm emailInicial={searchParams.email} />
      <p className="mt-8 text-center text-[13px] text-txt-2 dark:text-fg-2">
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" className="font-semibold text-green-dark dark:text-green-light underline-offset-4 hover:underline">Entrar</Link>
      </p>
    </div>
  );
}
