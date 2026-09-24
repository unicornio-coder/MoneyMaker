'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useFormState, useFormStatus } from 'react-dom';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { iniciarSesion, type AuthResult } from '@/lib/auth/actions';
import { Input } from '@/components/ui/Input';
import { GoogleButton } from './GoogleButton';

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary flex h-12 w-full items-center justify-center rounded-[40px] text-[15px]">
      {pending ? 'Entrando…' : 'Entrar'}
    </button>
  );
}

/** Correo, contraseña, entrar. Nada más. */
export function LoginForm({ next, errorInicial }: { next?: string; errorInicial?: string }) {
  const [estado, action] = useFormState<AuthResult | undefined, FormData>(iniciarSesion, errorInicial ? { error: errorInicial } : undefined);
  const [ver, setVer] = useState(false);
  return (
    <div className="mt-8 space-y-5">
      <form action={action} className="space-y-3.5">
        <input type="hidden" name="next" value={next ?? '/app'} />
        <Input name="email" type="email" label="Correo" placeholder="tu@correo.com" autoComplete="email" required autoFocus />
        <div className="relative">
          <Input name="password" type={ver ? 'text' : 'password'} label="Contraseña" placeholder="••••••••" autoComplete="current-password" className="pr-12" required />
          <button type="button" onClick={() => setVer((v) => !v)} aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'} className="absolute bottom-3 right-3 text-txt-3 transition-colors hover:text-fg">
            {ver ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
        {estado?.error && (
          <p className="flex items-center gap-2 rounded-input bg-negative-50 px-3.5 py-2.5 text-[12.5px] font-semibold text-negative animate-rise dark:bg-surface-2" role="alert">
            <AlertCircle size={16} /> {estado.error}
          </p>
        )}
        <Submit />
        <p className="text-center text-[13px]"><Link href="/recuperar" className="font-semibold text-txt-2 underline-offset-4 hover:text-fg hover:underline dark:text-fg-2">Olvidé mi contraseña</Link></p>
      </form>
      <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.9px] text-txt-3"><span className="h-px flex-1 bg-line-2 dark:bg-edge" />o<span className="h-px flex-1 bg-line-2 dark:bg-edge" /></div>
      <GoogleButton next={next} />
    </div>
  );
}
