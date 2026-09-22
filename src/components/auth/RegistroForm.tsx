'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { Mail, Check, Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react';
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
    <button type="submit" disabled={disabled || pending} className="btn-primary flex h-12 w-full items-center justify-center gap-2 rounded-[40px] text-[14px]">
      {pending ? (
        <>
          <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin-slow dark:border-ink/30 dark:border-t-ink" /> Creando tu cuenta…
        </>
      ) : (
        <>
          {children} <ArrowRight size={16} />
        </>
      )}
    </button>
  );
}

function Pasos({ actual }: { actual: 1 | 2 }) {
  return (
    <div className="mb-5 flex items-center gap-2 text-[11px] font-semibold text-txt-2 dark:text-fg-2">
      {(['Tu correo', 'Tu contraseña'] as const).map((p, i) => {
        const n = (i + 1) as 1 | 2;
        const hecho = n < actual;
        const activo = n === actual;
        return (
          <span key={p} className="flex items-center gap-2">
            <span className={cn('flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold transition-colors', hecho ? 'bg-green text-white' : activo ? 'bg-ink text-white dark:bg-white dark:text-ink' : 'bg-bg-chip text-txt-3 dark:bg-surface-2')}>{hecho ? <Check size={11} strokeWidth={3} /> : n}</span>
            <span className={cn(activo && 'text-fg')}>{p}</span>
            {i === 0 && <span className="mx-1 h-px w-8 origin-left bg-line-2 dark:bg-edge"><span className={cn('block h-px origin-left bg-green transition-transform duration-500', actual === 2 ? 'scale-x-100' : 'scale-x-0')} /></span>}
          </span>
        );
      })}
    </div>
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
        <Pasos actual={1} />
        <div className="animate-rise">
          <span className="section-label text-green">7 días gratis</span>
          <h1 className="mt-2 font-display text-[30px] font-bold leading-tight tracking-[-0.9px]">Crea tu cuenta</h1>
          <p className="mt-1.5 text-[14px] text-txt-2 dark:text-fg-2">Empieza con tu correo. Sin tarjeta para probar.</p>
        </div>
        <form
          className="mt-7 space-y-3.5 animate-rise [animation-delay:120ms]"
          onSubmit={(e) => {
            e.preventDefault();
            if (correoValido) setPaso(2);
          }}
        >
          <Input name="email" type="email" label="Correo" placeholder="tu@correo.com" autoComplete="email" icon={<Mail size={17} />} value={email} onChange={(e) => setEmail(e.target.value)} required />
          <button type="submit" disabled={!correoValido} className="btn-primary flex h-12 w-full items-center justify-center gap-2 rounded-[40px] text-[14px]">
            Continuar <ArrowRight size={16} />
          </button>
        </form>
        <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-[0.9px] text-txt-3 animate-rise [animation-delay:200ms]">
          <span className="h-px flex-1 bg-line-2 dark:bg-edge" />
          o
          <span className="h-px flex-1 bg-line-2 dark:bg-edge" />
        </div>
        <div className="animate-rise [animation-delay:260ms]">
          <GoogleButton next="/onboarding" label="Crear cuenta con Google" />
        </div>
        <p className="mt-6 text-center text-[11.5px] leading-relaxed text-txt-3 animate-rise [animation-delay:320ms]">
          Al continuar aceptas los Términos y el Aviso de privacidad. El PDF se lee y se descarta; nunca pedimos las claves de tu banco.
        </p>
      </div>
    );
  }

  return (
    <div className="animate-screen">
      <Pasos actual={2} />
      <h1 className="font-display text-[30px] font-bold leading-tight tracking-[-0.9px] animate-rise">Crea tu contraseña</h1>
      <div className="mt-4 flex items-center gap-2 rounded-input bg-green-50 px-3.5 py-2.5 text-[13px] animate-rise [animation-delay:80ms] dark:bg-surface-2">
        <Check size={16} className="text-green" />
        <span className="min-w-0 flex-1 truncate font-semibold">{email}</span>
        <button type="button" onClick={() => setPaso(1)} className="text-[12px] font-semibold text-green">
          Cambiar
        </button>
      </div>
      <form action={action} className="mt-5 space-y-4 animate-rise [animation-delay:140ms]">
        <input type="hidden" name="email" value={email} />
        <div className="relative">
          <Input
            name="password"
            type={ver ? 'text' : 'password'}
            label="Contraseña"
            placeholder="Mínimo 8 caracteres"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pr-12"
            required
          />
          <button type="button" onClick={() => setVer((v) => !v)} aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'} className="absolute bottom-3 right-3 text-txt-3 transition-colors hover:text-fg">
            {ver ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
        <div>
          <div className="flex gap-1.5">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={cn('h-1.5 flex-1 origin-left rounded-pill transition-all duration-300', i < cumplidos ? 'bg-green' : 'bg-line-2 dark:bg-edge')} />
            ))}
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11.5px] font-semibold text-txt-2 dark:text-fg-2">
            <span>{password ? NIVELES[Math.max(0, cumplidos - 1)] : ' '}</span>
            <span>{cumplidos}/4</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {REQUISITOS.map((r) => {
              const ok = r.test(password);
              return (
                <span key={r.label} className={cn('flex items-center gap-1 rounded-pill border px-2.5 py-1 text-[11px] font-semibold transition-all duration-300', ok ? 'border-green-200 bg-green-50 text-green dark:bg-surface-2' : 'border-line-2 text-txt-2 dark:border-edge dark:text-fg-2')}>
                  {ok && <Check size={11} strokeWidth={3} className="animate-pop" />}
                  {r.label}
                </span>
              );
            })}
          </div>
        </div>
        {estado?.error && (
          <p className="flex items-center gap-2 rounded-input bg-negative-50 px-3.5 py-2.5 text-[12.5px] font-semibold text-negative animate-rise dark:bg-surface-2" role="alert">
            <AlertCircle size={16} /> {estado.error}
          </p>
        )}
        <Submit disabled={cumplidos < 1 || password.length < 8}>Crear cuenta</Submit>
        <p className="text-center text-[11.5px] text-txt-3">Nunca guardamos tus claves bancarias ni la contraseña de tus PDFs.</p>
      </form>
    </div>
  );
}
