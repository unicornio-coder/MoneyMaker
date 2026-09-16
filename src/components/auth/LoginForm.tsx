'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { Mail, Lock } from 'lucide-react';
import { iniciarSesion, type AuthResult } from '@/lib/auth/actions';
import { Input } from '@/components/ui/Input';
import { GoogleButton } from './GoogleButton';

function Submit({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary mt-2 h-12 w-full rounded-[40px] text-[14px]">
      {pending ? 'Entrando…' : children}
    </button>
  );
}

export function LoginForm({ next, errorInicial }: { next?: string; errorInicial?: string }) {
  const [estado, action] = useFormState<AuthResult | undefined, FormData>(iniciarSesion, errorInicial ? { error: errorInicial } : undefined);
  return (
    <div className="mt-7 space-y-4">
      <GoogleButton next={next} />
      <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.9px] text-txt-3">
        <span className="h-px flex-1 bg-line-2 dark:bg-edge" />
        o con tu correo
        <span className="h-px flex-1 bg-line-2 dark:bg-edge" />
      </div>
      <form action={action} className="space-y-3.5">
        <input type="hidden" name="next" value={next ?? '/app'} />
        <Input name="email" type="email" label="Correo" placeholder="tu@correo.com" autoComplete="email" icon={<Mail size={17} />} required />
        <Input name="password" type="password" label="Contraseña" placeholder="••••••••" autoComplete="current-password" icon={<Lock size={17} />} required />
        {estado?.error && <p className="text-[12.5px] font-semibold text-negative">{estado.error}</p>}
        <Submit>Entrar</Submit>
      </form>
    </div>
  );
}
