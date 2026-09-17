'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { Mail, Check, Eye, EyeOff } from 'lucide-react';
import { registrarse, type AuthResult } from '@/lib/auth/actions';
import { cn } from '@/lib/cn';
import { Input } from '@/components/ui/Input';
import { GoogleButton } from './GoogleButton';

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const REQUISITOS: { label: string; test: (p: string) => boolean }[] = [
  { label: '8+ caracteres', test: (p) => p.length >= 8 },
  { label: 'Mayúscula', test: (p) => /[A-ZÁÉÍÓÚÑ]/.test(p) },
  { label: 'Número', test: (p) => /\d/.test(p) },
  { label: 'Símbolo', test: (p) => /[^\w\s]/.test(p) },
];

const NIVELES = ['Débil', 'Regular', 'Buena', 'Fuerte'];

function Submit({ disabled, children }: { disabled?: boolean; children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={disabled || pending} className="btn-primary h-12 w-full rounded-[40px] text-[14px]">
      {pending ? 'Creando tu cuenta…' : children}
    </button>
  );
}

/** Paso 1 correo → paso 2 contraseña (medidor de 4 segmentos y requisitos que se vuelven verdes). */
export function RegistroForm({ emailInicial }: { emailInicial?: string }) {
  const [paso, setPaso] = useState<1 | 2>(emailInicial && CORREO.test(emailInicial) ? 2 : 1);
  const [email, setEmail] = useState(emailInicial ?? '');
  const [password, setPassword] = useState('');
  const [ver, setVer] = useState(false);
  const [estado, action] = useFormState<AuthResult | undefined, FormData>(registrarse, undefined);

  const correoValido = CORREO.test(email);
  const cumplidos = REQUISITOS.filter((r) => r.test(password)).length;

  if (paso === 1) {
    return (
      <div className="animate-screen">
        <h1 className="font-display text-[28px] font-bold tracking-[-0.8px]">Crea tu cuenta</h1>
        <p className="mt-1.5 text-[14px] text-txt-2 dark:text-fg-2">Empieza con tu correo. 7 días gratis.</p>
        <form
          className="mt-7 space-y-3.5"
          onSubmit={(e) => {
            e.preventDefault();
            if (correoValido) setPaso(2);
          }}
        >
          <Input name="email" type="email" label="Correo" placeholder="tu@correo.com" autoComplete="email" icon={<Mail size={17} />} value={email} onChange={(e) => setEmail(e.target.value)} required />
          <button type="submit" disabled={!correoValido} className="btn-primary h-12 w-full rounded-[40px] text-[14px]">
            Continuar
          </button>
        </form>
        <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-[0.9px] text-txt-3">
          <span className="h-px flex-1 bg-line-2 dark:bg-edge" />
          o
          <span className="h-px flex-1 bg-line-2 dark:bg-edge" />
        </div>
        <GoogleButton next="/onboarding" label="Crear cuenta con Google" />
        <p className="mt-6 text-center text-[11.5px] leading-relaxed text-txt-3">
          Al continuar aceptas los Términos y el Aviso de privacidad. Solo lectura vía Belvo: nunca guardamos tus claves bancarias.
        </p>
      </div>
    );
  }

  return (
    <div className="animate-screen">
      <h1 className="font-display text-[28px] font-bold tracking-[-0.8px]">Crea tu contraseña</h1>
      <div className="mt-4 flex items-center gap-2 rounded-input bg-green-50 px-3.5 py-2.5 text-[13px] dark:bg-surface-2">
        <Check size={16} className="text-green" />
        <span className="min-w-0 flex-1 truncate font-semibold">{email}</span>
        <button type="button" onClick={() => setPaso(1)} className="text-[12px] font-semibold text-green">
          Cambiar
        </button>
      </div>
      <form action={action} className="mt-5 space-y-4">
        <input type="hidden" name="email" value={email} />
        <div>
          <Input
            name="password"
            type={ver ? 'text' : 'password'}
            label="Contraseña"
            placeholder="Mínimo 8 caracteres"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="button" onClick={() => setVer((v) => !v)} className="mt-1.5 flex items-center gap-1 text-[12px] font-semibold text-txt-2 dark:text-fg-2">
            {ver ? <EyeOff size={14} /> : <Eye size={14} />} {ver ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>
        <div>
          <div className="flex gap-1.5">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={cn('h-1.5 flex-1 rounded-pill transition-colors', i < cumplidos ? 'bg-green' : 'bg-line-2 dark:bg-edge')} />
            ))}
          </div>
          <div className="mt-1.5 text-[11.5px] font-semibold text-txt-2 dark:text-fg-2">{password ? NIVELES[Math.max(0, cumplidos - 1)] : ' '}</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {REQUISITOS.map((r) => {
              const ok = r.test(password);
              return (
                <span key={r.label} className={cn('rounded-pill border px-2.5 py-1 text-[11px] font-semibold transition-colors', ok ? 'border-green-200 bg-green-50 text-green dark:bg-surface-2' : 'border-line-2 text-txt-2 dark:border-edge dark:text-fg-2')}>
                  {r.label}
                </span>
              );
            })}
          </div>
        </div>
        {estado?.error && <p className="text-[12.5px] font-semibold text-negative">{estado.error}</p>}
        <Submit disabled={cumplidos < 1 || password.length < 8}>Continuar</Submit>
        <p className="text-center text-[11.5px] text-txt-3">Nunca guardamos tus claves bancarias. Solo lectura vía Belvo.</p>
      </form>
    </div>
  );
}
