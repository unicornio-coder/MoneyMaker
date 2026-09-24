'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { registrarse, type AuthResult } from '@/lib/auth/actions';
import { cn } from '@/lib/cn';
import { Input } from '@/components/ui/Input';
import { GoogleButton } from './GoogleButton';

function Submit({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={disabled || pending} className="btn-primary flex h-12 w-full items-center justify-center rounded-[40px] text-[15px]">
      {pending ? 'Creando tu cuenta…' : 'Crear cuenta'}
    </button>
  );
}

const fuerza = (p: string) => [p.length >= 8, /[A-ZÁÉÍÓÚÑ]/.test(p), /\d/.test(p), /[^\w\s]/.test(p)].filter(Boolean).length;

/** Un solo paso: correo y contraseña. La barra de fuerza es la única ayuda. */
export function RegistroForm({ emailInicial }: { emailInicial?: string }) {
  const [password, setPassword] = useState('');
  const [ver, setVer] = useState(false);
  const [estado, action] = useFormState<AuthResult | undefined, FormData>(registrarse, undefined);
  const n = fuerza(password);

  return (
    <div className="mt-8 space-y-5">
      <form action={action} className="space-y-3.5">
        <Input name="email" type="email" label="Correo" placeholder="tu@correo.com" autoComplete="email" defaultValue={emailInicial ?? ''} required autoFocus={!emailInicial} />
        <div className="relative">
          <Input name="password" type={ver ? 'text' : 'password'} label="Contraseña" placeholder="Mínimo 8 caracteres" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="pr-12" required autoFocus={!!emailInicial} />
          <button type="button" onClick={() => setVer((v) => !v)} aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'} className="absolute bottom-3 right-3 text-txt-3 transition-colors hover:text-fg">
            {ver ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
        {password && (
          <div className="flex gap-1.5" aria-label={`Fuerza de la contraseña ${n} de 4`}>
            {[0, 1, 2, 3].map((i) => <span key={i} className={cn('h-1 flex-1 rounded-pill transition-colors duration-300', i < n ? 'bg-green' : 'bg-line-2 dark:bg-edge')} />)}
          </div>
        )}
        {estado?.error && (
          <p className="flex items-center gap-2 rounded-input bg-negative-50 px-3.5 py-2.5 text-[12.5px] font-semibold text-negative animate-rise dark:bg-surface-2" role="alert">
            <AlertCircle size={16} /> {estado.error}
          </p>
        )}
        <Submit disabled={password.length < 8} />
      </form>
      <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.9px] text-txt-3"><span className="h-px flex-1 bg-line-2 dark:bg-edge" />o<span className="h-px flex-1 bg-line-2 dark:bg-edge" /></div>
      <GoogleButton next="/onboarding" label="Continuar con Google" />
      <p className="text-center text-[11.5px] text-txt-3">Al crear tu cuenta aceptas los Términos y el Aviso de privacidad.</p>
    </div>
  );
}
