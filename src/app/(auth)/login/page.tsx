import Link from 'next/link';
import { LoginForm } from '@/components/auth/LoginForm';

export const metadata = { title: 'Iniciar sesión · MoneyMaker' };

export default function LoginPage({ searchParams }: { searchParams: { next?: string; error?: string } }) {
  return (
    <div className="animate-screen">
      <h1 className="font-display text-[28px] font-bold tracking-[-0.8px]">Inicia sesión</h1>
      <p className="mt-1.5 text-[14px] text-txt-2 dark:text-fg-2">Tu quincena te está esperando.</p>
      <LoginForm next={searchParams.next} errorInicial={searchParams.error ? 'No pudimos iniciar sesión con Google. Intenta de nuevo.' : undefined} />
      <p className="mt-8 text-center text-[13px] text-txt-2 dark:text-fg-2">
        ¿No tienes cuenta?{' '}
        <Link href="/registro" className="font-semibold text-green">
          Crear cuenta
        </Link>
      </p>
    </div>
  );
}
