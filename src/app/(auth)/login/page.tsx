import Link from 'next/link';
import { AccesoTabs } from '@/components/auth/AccesoTabs';
import { LoginForm } from '@/components/auth/LoginForm';
import { GoogleButton } from '@/components/auth/GoogleButton';

export const metadata = { title: 'Entrar · MoneyMaker' };

const GOOGLE = process.env.NEXT_PUBLIC_LOGIN_GOOGLE === 'true';

export default function LoginPage({ searchParams }: { searchParams: { next?: string; error?: string; cuenta?: string } }) {
  return (
    <div className="animate-screen">
      <AccesoTabs activa="entrar" />
      <h1 className="font-display text-[32px] font-bold leading-tight tracking-[-1px]">Inicia sesión</h1>
      <p className="mt-1.5 text-[14px] text-txt-2 dark:text-fg-2">Entra con tu correo y tu contraseña.</p>
      {searchParams.cuenta === 'creada' && <p className="mt-4 rounded-input bg-green-50 px-3.5 py-2.5 text-[12.5px] font-semibold text-green-dark dark:bg-surface-2 dark:text-green-light" role="status">Tu cuenta quedó creada. Entra con tu correo y tu contraseña.</p>}
      {searchParams.error && <p className="mt-4 rounded-input bg-negative-50 px-3.5 py-2.5 text-[12.5px] font-semibold text-negative dark:bg-surface-2" role="alert">{searchParams.error === 'callback' ? 'Ese enlace ya no es válido. Entra con tu contraseña o crea una nueva con "Olvidé mi contraseña".' : 'No pudimos entrar con Google. Usa tu correo y contraseña.'}</p>}
      <LoginForm next={searchParams.next} />
      {GOOGLE && (
        <div className="mt-5 space-y-5">
          <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.9px] text-txt-3"><span className="h-px flex-1 bg-line-2 dark:bg-edge" />o<span className="h-px flex-1 bg-line-2 dark:bg-edge" /></div>
          <GoogleButton next={searchParams.next ?? '/app'} />
        </div>
      )}
      <p className="mt-6 text-center text-[13px] text-txt-2 dark:text-fg-2">
        ¿No tienes cuenta? <Link href="/registro" className="font-semibold text-green-dark underline-offset-4 hover:underline dark:text-green-light">Crear cuenta</Link>
      </p>
      <p className="mt-3 text-center text-[11.5px] text-txt-3">Si antes entrabas con un enlace por correo, crea tu contraseña con &ldquo;Olvidé mi contraseña&rdquo;.</p>
    </div>
  );
}
