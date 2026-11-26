import { AccesoForm } from '@/components/auth/AccesoForm';
import { GoogleButton } from '@/components/auth/GoogleButton';

export const metadata = { title: 'Entra o crea tu cuenta · MoneyMaker' };

const GOOGLE = process.env.NEXT_PUBLIC_LOGIN_GOOGLE === 'true';

/** Pantalla única de acceso: la misma para entrar y para crear cuenta (/registro llega aquí). */
export default function LoginPage({ searchParams }: { searchParams: { next?: string; error?: string; email?: string } }) {
  return (
    <div className="animate-screen">
      <h1 className="font-display text-[32px] font-bold leading-tight tracking-[-1px]">Entra o crea tu cuenta</h1>
      <p className="mt-1.5 text-[14px] text-txt-2 dark:text-fg-2">Con tu correo y una contraseña. Si es tu primera vez, la creamos aquí mismo.</p>
      {searchParams.error && <p className="mt-4 rounded-input bg-negative-50 px-3.5 py-2.5 text-[12.5px] font-semibold text-negative dark:bg-surface-2 dark:text-negative-100" role="alert">{searchParams.error === 'callback' ? 'Ese enlace ya no es válido. Entra con tu contraseña o crea una nueva con "Olvidé mi contraseña".' : 'No pudimos entrar con Google. Usa tu correo y contraseña.'}</p>}
      <AccesoForm next={searchParams.next} emailInicial={typeof searchParams.email === 'string' ? searchParams.email : undefined} />
      {GOOGLE && (
        <div className="mt-5 space-y-5">
          <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.9px] text-txt-3"><span className="h-px flex-1 bg-line-2 dark:bg-edge" />o<span className="h-px flex-1 bg-line-2 dark:bg-edge" /></div>
          <GoogleButton next={searchParams.next ?? '/app'} />
        </div>
      )}
    </div>
  );
}
