'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react';
import { iniciarSesion, type AuthResult } from '@/lib/auth/actions';
import { Input } from '@/components/ui/Input';
import { GoogleButton } from './GoogleButton';

function Submit({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-[40px] text-[14px]">
      {pending ? (
        <>
          <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin-slow dark:border-ink/30 dark:border-t-ink" /> Entrando…
        </>
      ) : (
        <>
          {children} <ArrowRight size={16} />
        </>
      )}
    </button>
  );
}

export function LoginForm({ next, errorInicial }: { next?: string; errorInicial?: string }) {
  const [estado, action] = useFormState<AuthResult | undefined, FormData>(iniciarSesion, errorInicial ? { error: errorInicial } : undefined);
  const [ver, setVer] = useState(false);
  return (
    <div className="mt-7 space-y-4">
      <div className="animate-rise [animation-delay:80ms]">
        <GoogleButton next={next} />
      </div>
      <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.9px] text-txt-3 animate-rise [animation-delay:140ms]">
        <span className="h-px flex-1 bg-line-2 dark:bg-edge" />
        o con tu correo
        <span className="h-px flex-1 bg-line-2 dark:bg-edge" />
      </div>
      <form action={action} className="space-y-3.5 animate-rise [animation-delay:200ms]">
        <input type="hidden" name="next" value={next ?? '/app'} />
        <Input name="email" type="email" label="Correo" placeholder="tu@correo.com" autoComplete="email" icon={<Mail size={17} />} required />
        <div className="relative">
          <Input name="password" type={ver ? 'text' : 'password'} label="Contraseña" placeholder="••••••••" autoComplete="current-password" icon={<Lock size={17} />} className="pr-12" required />
          <button type="button" onClick={() => setVer((v) => !v)} aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'} className="absolute bottom-3 right-3 text-txt-3 transition-colors hover:text-fg">
            {ver ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
        {estado?.error && (
          <p className="flex items-center gap-2 rounded-input bg-negative-50 px-3.5 py-2.5 text-[12.5px] font-semibold text-negative animate-rise dark:bg-surface-2" role="alert">
            <AlertCircle size={16} /> {estado.error}
          </p>
        )}
        <Submit>Entrar</Submit>
      </form>
    </div>
  );
}
