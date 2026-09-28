import { CorreoForm } from '@/components/auth/CorreoForm';

export const metadata = { title: 'Entrar · MoneyMaker' };

export default function LoginPage({ searchParams }: { searchParams: { next?: string; error?: string } }) {
  return (
    <div className="animate-screen">
      <h1 className="font-display text-[32px] font-bold leading-tight tracking-[-1px]">Entra con tu correo</h1>
      <p className="mt-1.5 text-[14px] text-txt-2 dark:text-fg-2">Si es tu primera vez, aquí mismo creamos tu cuenta.</p>
      {searchParams.error && <p className="mt-4 rounded-input bg-negative-50 px-3.5 py-2.5 text-[12.5px] font-semibold text-negative dark:bg-surface-2" role="alert">{searchParams.error === 'callback' ? 'El enlace ya no es válido. Pide uno nuevo.' : 'No pudimos entrar con Google. Usa tu correo.'}</p>}
      <CorreoForm next={searchParams.next} />
    </div>
  );
}
