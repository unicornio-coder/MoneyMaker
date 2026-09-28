'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PiggyBank, CreditCard, TrendingUp, Repeat, Users, Home, Check, ChevronLeft, Landmark, FileUp, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Logo } from '@/components/shell/Logo';
import { PanelMarca } from '@/components/auth/PanelMarca';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ModalBancos } from '@/components/cuentas/ModalBancos';
import { actualizarPerfil } from '@/app/app/ajustes/acciones';
import { crearContraseña } from '@/lib/auth/actions';
import type { DatosInicio } from '@/components/inicio/tipos';

// Tres pasos: tu cuenta (nombre y contraseña opcional) → metas → conecta (banco o PDF). Sin "saltar": sin una fuente de
// datos no hay panel. Los días de pago se infieren de la nómina y se ajustan en Ajustes.

const METAS = [
  { id: 'ahorrar', label: 'Ahorrar cada quincena', beneficio: 'Te decimos cuánto te sobra antes de gastarlo.', icon: PiggyBank },
  { id: 'deudas', label: 'Salir de deudas', beneficio: 'Tarjetas, meses sin intereses y fechas límite en un lugar.', icon: CreditCard },
  { id: 'invertir', label: 'Invertir mejor', beneficio: 'Cuánto puedes mandar a CETES o GBM+ cada quincena.', icon: TrendingUp },
  { id: 'suscripciones', label: 'Controlar suscripciones', beneficio: 'Cuáles pagas, desde cuándo y cómo cancelarlas.', icon: Repeat },
  { id: 'familia', label: 'Presupuesto familiar', beneficio: 'Gasto por categoría, claro para toda la casa.', icon: Users },
  { id: 'casa', label: 'Comprar casa o auto', beneficio: 'Patrimonio y metas grandes con fecha.', icon: Home },
];

const PASOS = ['Tu cuenta', 'Metas', 'Conecta'];
const ULTIMO = PASOS.length - 1;

type Props = {
  /** Nombre real del usuario (perfil o registro); null si solo tenemos el correo. */
  nombre: string | null;
  perfil: { metas: string[] };
  pasoInicial: number;
  /** Ya entró con contraseña: no se la volvemos a pedir. */
  tieneContraseña: boolean;
  instituciones: DatosInicio['instituciones'];
  agregador: 'belvo' | 'mock';
  sandbox?: boolean;
};

export function Onboarding({ nombre: nombreInicial, perfil, pasoInicial, tieneContraseña, instituciones, agregador, sandbox }: Props) {
  const [paso, setPaso] = useState(Math.min(ULTIMO, pasoInicial));
  const [nombre, setNombre] = useState(nombreInicial ?? '');
  const [password, setPassword] = useState('');
  const [ver, setVer] = useState(false);
  const [metas, setMetas] = useState<string[]>(perfil.metas);
  const [error, setError] = useState<string | null>(null);
  const [bancos, setBancos] = useState(false);
  const [pendiente, start] = useTransition();
  const router = useRouter();

  const terminar = (destino: '/app/importar' | '/app') =>
    start(async () => {
      await actualizarPerfil({ onboardingCompleto: true });
      router.push(destino);
      router.refresh();
    });

  const siguiente = () => {
    setError(null);
    if (paso === 0) {
      if (!nombre.trim()) return setError('Escribe tu nombre.');
      if (password && password.length < 8) return setError('La contraseña necesita al menos 8 caracteres.');
      start(async () => {
        const r = await actualizarPerfil({ nombre: nombre.trim() });
        if (!r.ok) return setError(r.error ?? 'No se pudo guardar.');
        if (password) {
          const c = await crearContraseña(password);
          if (c.error) return setError(c.error);
        }
        setPaso(1);
      });
    } else if (paso === 1) {
      start(async () => {
        const r = await actualizarPerfil({ metas });
        if (!r.ok) return setError(r.error ?? 'No se pudo guardar.');
        setPaso(2);
      });
    }
  };

  return (
    <div className="grid min-h-dvh bg-surface lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <div className="hidden lg:block">
        <PanelMarca />
      </div>

      <div className="flex min-h-dvh flex-col bg-bg-input dark:bg-canvas">
        <header className="bg-surface shadow-[0_1px_0_var(--edge)]">
          <div className="mx-auto flex h-[64px] max-w-[640px] items-center gap-3 px-5">
            {paso > 0 ? (
              <button type="button" onClick={() => setPaso((p) => p - 1)} aria-label="Atrás" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-bg-muted dark:hover:bg-surface-2"><ChevronLeft size={18} /></button>
            ) : (
              <Link href="/" className="flex items-center gap-2" aria-label="MoneyMaker"><Logo /><span className="font-display text-[14px] font-bold lg:hidden">MoneyMaker</span></Link>
            )}
            <div className="ml-auto text-[12px] font-semibold text-txt-2 dark:text-fg-2">Paso {paso + 1} de {PASOS.length}</div>
          </div>
          <ol className="mx-auto grid max-w-[640px] grid-cols-3 gap-1.5 px-5 pb-3" aria-label="Pasos">
            {PASOS.map((p, i) => (
              <li key={p} className="min-w-0">
                <div className={cn('h-1 rounded-pill transition-colors duration-300', i <= paso ? 'bg-green' : 'bg-line dark:bg-surface-2')} />
                <div className={cn('mt-1.5 truncate text-[10.5px] font-semibold', i === paso ? 'text-fg' : 'text-txt-3')} aria-current={i === paso ? 'step' : undefined}>{p}</div>
              </li>
            ))}
          </ol>
        </header>

        <main className="mx-auto w-full max-w-[640px] flex-1 animate-screen px-5 pb-8 pt-7 md:pt-9" key={paso}>
          {paso === 0 && (
            <>
              <h1 className="font-display text-[28px] font-bold leading-[1.1] tracking-[-0.9px] md:text-[34px]">Bienvenido a MoneyMaker</h1>
              <p className="mt-2 text-[14.5px] leading-relaxed text-txt-2 dark:text-fg-2">Dinos cómo te llamas. La contraseña es opcional: sin ella entras siempre con el enlace que te mandamos al correo.</p>
              <div className="mt-6 space-y-4">
                <Input label="Tu nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Como quieres que te llamemos" autoComplete="given-name" className="bg-surface" autoFocus />
                {!tieneContraseña && (
                  <div className="relative">
                    <Input label="Contraseña (opcional)" type={ver ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" autoComplete="new-password" className="bg-surface pr-12" />
                    <button type="button" onClick={() => setVer((v) => !v)} aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'} className="absolute bottom-3 right-3 text-txt-3 transition-colors hover:text-fg">{ver ? <EyeOff size={17} /> : <Eye size={17} />}</button>
                  </div>
                )}
              </div>
              {error && <p className="mt-3 text-[12.5px] font-semibold text-negative">{error}</p>}
            </>
          )}

          {paso === 1 && (
            <>
              <h1 className="font-display text-[28px] font-bold leading-[1.1] tracking-[-0.9px] md:text-[34px]">¿Qué quieres lograr?</h1>
              <p className="mt-2 text-[14.5px] leading-relaxed text-txt-2 dark:text-fg-2">Elige una o varias. Puedes cambiarlo después.</p>
              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {METAS.map((m, i) => {
                  const on = metas.includes(m.id);
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setMetas((xs) => (on ? xs.filter((x) => x !== m.id) : [...xs, m.id]))}
                      className={cn('relative flex items-start gap-3.5 rounded-card-lg p-4 text-left transition-all duration-[220ms] animate-rise', on ? 'text-white shadow-green' : 'bg-surface text-fg shadow-card hover:-translate-y-0.5 hover:shadow-hover')}
                      style={{ animationDelay: `${i * 50}ms`, ...(on ? { background: 'linear-gradient(135deg, #0B1F17 0%, #15803D 60%, #16A34A 100%)' } : {}) }}
                    >
                      <span className={cn('flex h-10 w-10 flex-none items-center justify-center rounded-full', on ? 'bg-white/15 text-green-light' : 'bg-green-50 text-green-dark dark:bg-surface-2 dark:text-green-light')}><Icon size={19} /></span>
                      <span className="min-w-0 flex-1 pr-6">
                        <span className="block text-[14px] font-bold leading-snug">{m.label}</span>
                        <span className={cn('mt-0.5 block text-[12px] leading-snug', on ? 'text-white/75' : 'text-txt-2 dark:text-fg-2')}>{m.beneficio}</span>
                      </span>
                      <span className={cn('absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full transition-all', on ? 'bg-green-light text-ink' : 'border border-line-2 dark:border-edge-2')} aria-hidden>{on && <Check size={14} strokeWidth={3} />}</span>
                    </button>
                  );
                })}
              </div>
              {error && <p className="mt-3 text-[12.5px] font-semibold text-negative">{error}</p>}
            </>
          )}

          {paso === 2 && (
            <>
              <h1 className="font-display text-[28px] font-bold leading-[1.1] tracking-[-0.9px] md:text-[34px]">Conecta tu dinero</h1>
              <p className="mt-2 text-[14.5px] leading-relaxed text-txt-2 dark:text-fg-2">Elige una forma de empezar. Con una basta; después puedes agregar más.</p>
              <div className="mt-6 grid gap-3">
                <button type="button" onClick={() => setBancos(true)} className="flex items-center gap-4 rounded-card-xl bg-ink p-5 text-left text-white shadow-dark transition-transform hover:-translate-y-0.5">
                  <span className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-green text-white"><Landmark size={22} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-[18px] font-bold leading-snug">Conectar mi banco</span>
                    <span className="mt-0.5 block text-[12.5px] text-white/70">BBVA, Banorte, Santander, Nu y más. Se actualiza solo cada día.</span>
                  </span>
                </button>
                <button type="button" disabled={pendiente} onClick={() => terminar('/app/importar')} className="flex items-center gap-4 rounded-card-xl bg-surface p-5 text-left shadow-card transition-transform hover:-translate-y-0.5">
                  <span className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-green-50 text-green-dark dark:bg-surface-2 dark:text-green-light"><FileUp size={22} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-[18px] font-bold leading-snug">Subir estado de cuenta</span>
                    <span className="mt-0.5 block text-[12.5px] text-txt-2 dark:text-fg-2">El PDF que te manda tu banco. Se lee y se descarta.</span>
                  </span>
                </button>
              </div>
              <p className="mt-5 flex items-center justify-center gap-1.5 text-[12px] text-txt-3"><ShieldCheck size={14} /> Solo lectura. Nunca pedimos las claves de tu banco.</p>
              <ModalBancos open={bancos} onClose={() => setBancos(false)} onConectado={() => terminar('/app')} instituciones={instituciones} agregador={agregador} sandbox={sandbox} />
            </>
          )}
        </main>

        {paso < ULTIMO && (
          <footer className="sticky bottom-0 border-t border-edge bg-surface/95 backdrop-blur">
            <div className="mx-auto flex max-w-[640px] items-center gap-3 px-5 py-3.5 pb-[max(14px,env(safe-area-inset-bottom))]">
              <Button size="lg" full className="flex-1" disabled={pendiente || (paso === 1 && metas.length === 0)} onClick={siguiente}>
                {pendiente ? 'Un momento…' : paso === 1 && metas.length === 0 ? 'Elige al menos una meta' : 'Continuar'}
              </Button>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}
