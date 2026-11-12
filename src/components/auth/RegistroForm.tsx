'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useFormState, useFormStatus } from 'react-dom';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { registrarse, type AuthResult } from '@/lib/auth/actions';
import { Input } from '@/components/ui/Input';

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary flex h-12 w-full items-center justify-center rounded-[40px] text-[15px]">
      {pending ? 'Creando tu cuenta…' : 'Crear cuenta'}
    </button>
  );
}

/** Registro: nombre, correo y contraseña. Al terminar manda a iniciar sesión; no hay correo de confirmación. */
export function RegistroForm({ emailInicial }: { emailInicial?: string }) {
  const [estado, action] = useFormState<AuthResult | undefined, FormData>(registrarse, undefined);
  const [ver, setVer] = useState(false);
  return (
    <div className="mt-8 space-y-5">
      <form action={action} className="space-y-3.5">
        <Input name="nombre" type="text" label="Tu nombre" placeholder="Como quieres que te llamemos" autoComplete="given-name" maxLength={80} required autoFocus={!emailInicial} />
        <Input name="email" type="email" label="Tu correo" placeholder="tu@correo.com" autoComplete="email" defaultValue={emailInicial} required />
        <div className="relative">
          <Input name="password" type={ver ? 'text' : 'password'} label="Crea una contraseña" placeholder="Mínimo 8 caracteres" autoComplete="new-password" minLength={8} className="pr-12" required />
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
      </form>
      <p className="text-center text-[11.5px] text-txt-3">Al continuar aceptas los <Link href="/legal/terminos" className="underline-offset-2 hover:underline">Términos</Link> y el <Link href="/legal/privacidad" className="underline-offset-2 hover:underline">Aviso de privacidad</Link>.</p>
    </div>
  );
}
