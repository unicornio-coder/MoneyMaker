import Link from 'next/link';
import { LoginForm } from '@/components/auth/LoginForm';

export const metadata = { title: 'Iniciar sesión · MoneyMaker' };

export default function LoginPage({ searchParams }: { searchParams: { next?: string; error?: string } }) {
  return (
    <div className="animate-screen">
      <div className="animate-rise">
        <span className="section-label text-green">Bienvenido de nuevo</span>
        <h1 className="mt-2 font-display text-[30px] font-bold leading-tight tracking-[-0.9px]">Inicia sesión</h1>
        <p className="mt-1.5 text-[14px] text-txt-2 dark:text-fg-2">Tu quincena te está esperando.</p>
      </div>
      <LoginForm next={searchParams.next} errorInicial={searchParams.error ? 'No pudimos iniciar sesión con Google. Intenta de nuevo.' : undefined} />
      <p className="mt-8 text-center text-[13px] text-txt-2 dark:text-fg-2 animate-rise [animation-delay:320ms]">
        ¿No tienes cuenta?{' '}
        <Link href="/registro" className="font-semibold text-green underline-offset-4 hover:underline">
          Crear cuenta gratis
        </Link>
      </p>
    </div>
  );
}
