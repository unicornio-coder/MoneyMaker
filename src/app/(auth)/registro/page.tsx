import Link from 'next/link';
import { RegistroForm } from '@/components/auth/RegistroForm';

export const metadata = { title: 'Crea tu cuenta · MoneyMaker' };

export default function RegistroPage({ searchParams }: { searchParams: { email?: string } }) {
  return (
    <div className="animate-screen">
      <p className="mb-6 text-right text-[13px] text-txt-2 dark:text-fg-2 animate-rise">
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" className="font-semibold text-green underline-offset-4 hover:underline">
          Iniciar sesión
        </Link>
      </p>
      <RegistroForm emailInicial={searchParams.email} />
    </div>
  );
}
