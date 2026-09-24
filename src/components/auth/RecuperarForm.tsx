'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { AlertCircle, Check, Eye, EyeOff } from 'lucide-react';
import { cambiarContraseña, recuperarContraseña, type AuthResult } from '@/lib/auth/actions';
import { Input } from '@/components/ui/Input';

function Submit({ texto, pendiente }: { texto: string; pendiente: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary flex h-12 w-full items-center justify-center rounded-[40px] text-[15px]">
      {pending ? pendiente : texto}
    </button>
  );
}

/** Pide el correo y manda el enlace de recuperación. Siempre responde igual (exista o no la cuenta). */
export function RecuperarForm() {
  const [estado, action] = useFormState<(AuthResult & { enviado?: boolean }) | undefined, FormData>(recuperarContraseña, undefined);
  if (estado?.enviado) {
    return (
      <div className="mt-8 rounded-card-lg bg-green-50 p-5 text-[14px] dark:bg-surface-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-green text-white"><Check size={20} strokeWidth={3} /></span>
        <p className="mt-3 font-bold">Revisa tu correo.</p>
        <p className="mt-1 text-txt-2 dark:text-fg-2">Si esa dirección tiene cuenta, en un minuto te llega un enlace para crear una contraseña nueva. Revisa también la carpeta de spam.</p>
      </div>
    );
  }
  return (
    <form action={action} className="mt-8 space-y-3.5">
      <Input name="email" type="email" label="Correo" placeholder="tu@correo.com" autoComplete="email" required autoFocus />
      {estado?.error && (
        <p className="flex items-center gap-2 rounded-input bg-negative-50 px-3.5 py-2.5 text-[12.5px] font-semibold text-negative dark:bg-surface-2" role="alert"><AlertCircle size={16} /> {estado.error}</p>
      )}
      <Submit texto="Mandar enlace" pendiente="Mandando…" />
    </form>
  );
}

/** Nueva contraseña, ya con la sesión que abrió el enlace del correo. */
export function RestablecerForm() {
  const [estado, action] = useFormState<AuthResult | undefined, FormData>(cambiarContraseña, undefined);
  const [ver, setVer] = useState(false);
  return (
    <form action={action} className="mt-8 space-y-3.5">
      <div className="relative">
        <Input name="password" type={ver ? 'text' : 'password'} label="Contraseña nueva" placeholder="Mínimo 8 caracteres" autoComplete="new-password" className="pr-12" required autoFocus />
        <button type="button" onClick={() => setVer((v) => !v)} aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'} className="absolute bottom-3 right-3 text-txt-3 transition-colors hover:text-fg">
          {ver ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
      {estado?.error && (
        <p className="flex items-center gap-2 rounded-input bg-negative-50 px-3.5 py-2.5 text-[12.5px] font-semibold text-negative dark:bg-surface-2" role="alert"><AlertCircle size={16} /> {estado.error}</p>
      )}
      <Submit texto="Guardar y entrar" pendiente="Guardando…" />
    </form>
  );
}
