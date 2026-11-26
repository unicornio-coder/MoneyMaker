'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useFormState, useFormStatus } from 'react-dom';
import { AlertCircle, Eye, EyeOff, UserRound } from 'lucide-react';
import { continuarConCorreo, type AccesoResult } from '@/lib/auth/actions';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/cn';

type Campo = NonNullable<AccesoResult['campo']>;

function Submit({ nuevo }: { nuevo: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary flex h-12 w-full items-center justify-center rounded-[40px] text-[15px]">
      {pending ? (nuevo ? 'Creando tu cuenta…' : 'Entrando…') : nuevo ? 'Crear mi cuenta' : 'Continuar'}
    </button>
  );
}

const enlace = 'font-semibold text-green-dark underline underline-offset-4 dark:text-green-light';

function ErrorCampo({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p id={id} role="alert" className="mt-1.5 flex items-start gap-1.5 text-[12px] font-semibold text-negative animate-rise dark:text-negative-100">
      <AlertCircle size={14} className="mt-px flex-none" />
      <span>{children}</span>
    </p>
  );
}

/**
 * Acceso único: correo, contraseña y "Continuar". Si el correo no tiene cuenta, aquí mismo aparece "¿Cómo te
 * llamas?" y el botón cambia a "Crear mi cuenta"; los campos son controlados para que nada se tenga que volver a
 * escribir entre un paso y otro.
 */
export function AccesoForm({ next, emailInicial }: { next?: string; emailInicial?: string }) {
  const [estado, action] = useFormState<AccesoResult | undefined, FormData>(continuarConCorreo, undefined);
  const [email, setEmail] = useState(emailInicial ?? '');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [ver, setVer] = useState(false);
  // El error de un campo se oculta en cuanto la persona lo corrige; vuelve a evaluarse en el siguiente envío.
  const [corregido, setCorregido] = useState<Campo | null>(null);
  useEffect(() => setCorregido(null), [estado]);

  // El nombre solo se pide para el correo que se revisó; si la persona cambia el correo, se vuelve a "Continuar".
  const nuevo = estado?.paso === 'nuevo' && estado.email === email.trim().toLowerCase();
  const errorDe = (c: Campo) => (estado?.error && estado.campo === c && corregido !== c && (c !== 'nombre' || nuevo) ? estado : null);
  const errorGeneral = estado?.error && !estado.campo ? estado : null;
  const eEmail = errorDe('email');
  const ePassword = errorDe('password');
  const eNombre = errorDe('nombre');

  const cambiar = (c: Campo, set: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    set(e.target.value);
    if (estado?.campo === c) setCorregido(c);
  };

  return (
    <div className="mt-8 space-y-5">
      <form action={action} className="space-y-3.5" noValidate>
        <input type="hidden" name="next" value={next ?? '/app'} />
        <div>
          <Input
            name="email"
            type="email"
            label="Correo"
            placeholder="tu@correo.com"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={cambiar('email', setEmail)}
            aria-invalid={eEmail ? true : undefined}
            aria-describedby={eEmail ? 'error-email' : undefined}
            className={cn(eEmail && 'border-negative')}
            autoFocus={!emailInicial}
            required
          />
          {eEmail && <ErrorCampo id="error-email">{eEmail.error}</ErrorCampo>}
        </div>

        <div>
          <div className="relative">
            <Input
              name="password"
              type={ver ? 'text' : 'password'}
              label="Contraseña"
              placeholder={nuevo ? 'Mínimo 8 caracteres' : 'Tu contraseña'}
              autoComplete={nuevo ? 'new-password' : 'current-password'}
              value={password}
              onChange={cambiar('password', setPassword)}
              aria-invalid={ePassword ? true : undefined}
              aria-describedby={ePassword ? 'error-password' : nuevo ? 'ayuda-password' : undefined}
              className={cn('pr-12', ePassword && 'border-negative')}
              autoFocus={!!emailInicial}
              required
            />
            <button type="button" onClick={() => setVer((v) => !v)} aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={ver} className="absolute bottom-3 right-3 text-txt-3 transition-colors hover:text-fg">
              {ver ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
          {ePassword ? (
            <ErrorCampo id="error-password">
              {ePassword.error}
              {ePassword.olvido && <> <Link href="/recuperar" className={enlace}>Olvidé mi contraseña</Link></>}
            </ErrorCampo>
          ) : (
            nuevo && <p id="ayuda-password" className="mt-1.5 text-[12px] text-txt-2 dark:text-fg-2">Mínimo 8 caracteres.</p>
          )}
        </div>

        {nuevo && (
          <div className="space-y-3.5 animate-rise">
            <p role="status" className="flex items-start gap-2.5 rounded-input bg-green-50 px-3.5 py-3 text-[13px] text-fg dark:bg-surface-2">
              <UserRound size={17} className="mt-px flex-none text-green-dark dark:text-green-light" />
              <span>Es tu primera vez con este correo. Dinos cómo te llamas y creamos tu cuenta.</span>
            </p>
            <div>
              <Input
                name="nombre"
                type="text"
                label="¿Cómo te llamas?"
                placeholder="Tu nombre"
                autoComplete="given-name"
                maxLength={80}
                value={nombre}
                onChange={cambiar('nombre', setNombre)}
                aria-invalid={eNombre ? true : undefined}
                aria-describedby={eNombre ? 'error-nombre' : undefined}
                className={cn(eNombre && 'border-negative')}
                autoFocus
                required
              />
              {eNombre && <ErrorCampo id="error-nombre">{eNombre.error}</ErrorCampo>}
            </div>
          </div>
        )}

        {errorGeneral && (
          <p className="flex items-start gap-2 rounded-input bg-negative-50 px-3.5 py-2.5 text-[12.5px] font-semibold text-negative animate-rise dark:bg-surface-2 dark:text-negative-100" role="alert">
            <AlertCircle size={16} className="mt-px flex-none" />
            <span>
              {errorGeneral.error}
              {errorGeneral.olvido && <> <Link href="/recuperar" className={enlace}>Olvidé mi contraseña</Link></>}
            </span>
          </p>
        )}

        <Submit nuevo={nuevo} />
        {!nuevo && (
          <p className="text-center text-[13px]">
            <Link href="/recuperar" className="font-semibold text-txt-2 underline-offset-4 hover:text-fg hover:underline dark:text-fg-2">Olvidé mi contraseña</Link>
          </p>
        )}
      </form>
      <p className="text-center text-[11.5px] text-txt-3">
        Al continuar aceptas los <Link href="/legal/terminos" className="underline-offset-2 hover:underline">Términos</Link> y el <Link href="/legal/privacidad" className="underline-offset-2 hover:underline">Aviso de privacidad</Link>.
      </p>
    </div>
  );
}
