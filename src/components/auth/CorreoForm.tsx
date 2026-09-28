'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useFormState, useFormStatus } from 'react-dom';
import { AlertCircle, MailCheck } from 'lucide-react';
import { entrarConCorreo, type AuthResult } from '@/lib/auth/actions';
import { Input } from '@/components/ui/Input';
import { GoogleButton } from './GoogleButton';
import { LoginForm } from './LoginForm';

const GOOGLE = process.env.NEXT_PUBLIC_LOGIN_GOOGLE === 'true';

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary flex h-12 w-full items-center justify-center rounded-[40px] text-[15px]">
      {pending ? 'Mandando el enlace…' : 'Continuar con mi correo'}
    </button>
  );
}

/** Una sola pantalla para entrar o crear cuenta: correo → enlace por correo. Contraseña y Google, secundarios. */
export function CorreoForm({ next }: { next?: string }) {
  const [estado, action] = useFormState<(AuthResult & { enviado?: boolean; email?: string }) | undefined, FormData>(entrarConCorreo, undefined);
  const [conContraseña, setConContraseña] = useState(false);

  if (estado?.enviado) {
    return (
      <div className="mt-8 space-y-4 animate-rise" role="status">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-dark dark:bg-surface-2 dark:text-green-light"><MailCheck size={26} /></span>
        <h2 className="font-display text-[22px] font-bold tracking-[-0.5px]">Revisa tu correo</h2>
        <p className="text-[14px] leading-relaxed text-txt-2 dark:text-fg-2">Te mandamos un enlace a <b className="text-fg">{estado.email}</b>. Ábrelo desde este mismo dispositivo y entras sin contraseña. Si no llega en un minuto, revisa spam.</p>
        <form action={action}>
          <input type="hidden" name="email" value={estado.email} />
          <input type="hidden" name="next" value={next ?? '/onboarding'} />
          <button type="submit" className="text-[13px] font-semibold text-green-dark underline-offset-4 hover:underline dark:text-green-light">Volver a mandar</button>
        </form>
      </div>
    );
  }

  if (conContraseña) {
    return (
      <div>
        <LoginForm next={next} />
        <button type="button" onClick={() => setConContraseña(false)} className="mt-4 w-full text-center text-[13px] font-semibold text-txt-2 underline-offset-4 hover:underline dark:text-fg-2">Mejor mándame un enlace</button>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-5">
      <form action={action} className="space-y-3.5">
        <input type="hidden" name="next" value={next ?? '/onboarding'} />
        <Input name="email" type="email" label="Tu correo" placeholder="tu@correo.com" autoComplete="email" required autoFocus />
        {estado?.error && (
          <p className="flex items-center gap-2 rounded-input bg-negative-50 px-3.5 py-2.5 text-[12.5px] font-semibold text-negative animate-rise dark:bg-surface-2" role="alert">
            <AlertCircle size={16} /> {estado.error}
          </p>
        )}
        <Submit />
        <p className="text-center text-[12px] text-txt-3">Te mandamos un enlace. Sin contraseña, sin formularios.</p>
      </form>
      {GOOGLE && (
        <>
          <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.9px] text-txt-3"><span className="h-px flex-1 bg-line-2 dark:bg-edge" />o<span className="h-px flex-1 bg-line-2 dark:bg-edge" /></div>
          <GoogleButton next={next ?? '/onboarding'} />
        </>
      )}
      <p className="text-center text-[13px]">
        <button type="button" onClick={() => setConContraseña(true)} className="font-semibold text-txt-2 underline-offset-4 hover:text-fg hover:underline dark:text-fg-2">Tengo contraseña</button>
      </p>
      <p className="text-center text-[11.5px] text-txt-3">Al continuar aceptas los <Link href="/legal/terminos" className="underline-offset-2 hover:underline">Términos</Link> y el <Link href="/legal/privacidad" className="underline-offset-2 hover:underline">Aviso de privacidad</Link>.</p>
    </div>
  );
}
