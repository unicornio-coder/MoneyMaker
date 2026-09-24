import Link from 'next/link';
import { LoginForm } from '@/components/auth/LoginForm';

export const metadata = { title: 'Entrar · MoneyMaker' };

export default function LoginPage({ searchParams }: { searchParams: { next?: string; error?: string } }) {
  return (
    <div className="animate-screen">
      <h1 className="font-display text-[32px] font-bold leading-tight tracking-[-1px]">Entrar</h1>
      <LoginForm next={searchParams.next} errorInicial={searchParams.error ? 'No pudimos iniciar sesión con Google. Intenta de nuevo.' : undefined} />
      <p className="mt-8 text-center text-[13px] text-txt-2 dark:text-fg-2">
        ¿Nuevo aquí?{' '}
        <Link href="/registro" className="font-semibold text-green-dark dark:text-green-light underline-offset-4 hover:underline">Crear cuenta</Link>
      </p>
    </div>
  );
}
