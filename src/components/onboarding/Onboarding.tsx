'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { PiggyBank, CreditCard, TrendingUp, Repeat, Users, Home, Check, ChevronLeft, FileText, Lock, ShieldCheck, Upload } from 'lucide-react';
import { cn } from '@/lib/cn';
import { money } from '@/lib/format';
import { Logo } from '@/components/shell/Logo';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { actualizarPerfil } from '@/app/app/ajustes/acciones';
import { resumenOnboarding } from '@/app/onboarding/acciones';

// Cuatro pasos, sin conexión bancaria: metas → quincena → plan → primer estado de cuenta.
// La lectura del PDF ocurre en /app/importar, que ya tiene todo el flujo (cola, contraseña, revisión).

const METAS = [
  { id: 'ahorrar', label: 'Ahorrar cada quincena', icon: PiggyBank, activa: 'Objetivos de ahorro y "puedes invertir $X"' },
  { id: 'deudas', label: 'Salir de deudas', icon: CreditCard, activa: 'Tarjetas, MSI y fechas límite en Inicio' },
  { id: 'invertir', label: 'Invertir mejor', icon: TrendingUp, activa: 'Inversiones y rendimiento por cuenta' },
  { id: 'suscripciones', label: 'Controlar suscripciones', icon: Repeat, activa: 'Detección y cancelación de suscripciones' },
  { id: 'familia', label: 'Presupuesto familiar', icon: Users, activa: 'Presupuesto por categoría y por integrante' },
  { id: 'casa', label: 'Comprar casa o auto', icon: Home, activa: 'Patrimonio y metas grandes' },
];

const PASOS = ['Metas', 'Quincena', 'Plan', 'Tu primer estado de cuenta'];
const ULTIMO = PASOS.length - 1;

type Props = { nombre: string; perfil: { metas: string[]; diasPago: number[]; ingresoQuincenal: number | null }; pasoInicial: number };

export function Onboarding({ nombre, perfil, pasoInicial }: Props) {
  const [paso, setPaso] = useState(Math.min(ULTIMO, pasoInicial));
  const [metas, setMetas] = useState<string[]>(perfil.metas);
  const [dias, setDias] = useState<number[]>(perfil.diasPago?.length ? perfil.diasPago : [5, 20]);
  const [ingreso, setIngreso] = useState(perfil.ingresoQuincenal ? String(perfil.ingresoQuincenal) : '');
  const [error, setError] = useState<string | null>(null);
  const [resumen, setResumen] = useState<Awaited<ReturnType<typeof resumenOnboarding>> | null>(null);
  const [pendiente, start] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (paso === ULTIMO) resumenOnboarding().then(setResumen).catch(() => setResumen(null));
  }, [paso]);

  const terminar = (destino: '/app/importar' | '/app') =>
    start(async () => {
      await actualizarPerfil({ onboardingCompleto: true });
      router.push(destino);
      router.refresh();
    });

  const siguiente = () => {
    setError(null);
    if (paso === 0) start(async () => { await actualizarPerfil({ metas }); setPaso(1); });
    else if (paso === 1) {
      if (!dias.length) return setError('Elige al menos un día de pago.');
      start(async () => { await actualizarPerfil({ diasPago: dias, ingresoQuincenal: ingreso ? Number(ingreso) : null }); setPaso(2); });
    } else if (paso === 2) setPaso(3);
    else terminar('/app/importar');
  };

  return (
    <div className="min-h-dvh bg-bg-input dark:bg-canvas">
      <header className="sticky top-0 z-10 bg-surface shadow-[0_1px_0_var(--edge)]">
        <div className="mx-auto flex h-[64px] max-w-[640px] items-center gap-3 px-5">
          {paso > 0 ? <button type="button" onClick={() => setPaso((p) => p - 1)} aria-label="Atrás" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-bg-muted dark:hover:bg-surface-2"><ChevronLeft size={18} /></button> : <Logo />}
          <div className="flex-1 truncate text-[12.5px] font-semibold text-txt-2 dark:text-fg-2">Paso {paso + 1} de {PASOS.length} · {PASOS[paso]}</div>
        </div>
        <div className="mx-auto h-1 max-w-[640px] bg-line dark:bg-surface-2"><div className="h-1 bg-green transition-[width] duration-[400ms] ease-out" style={{ width: `${((paso + 1) / PASOS.length) * 100}%` }} /></div>
      </header>

      <main className="mx-auto max-w-[640px] animate-screen px-5 pb-32 pt-8" key={paso}>
        {paso === 0 && (
          <>
            <h1 className="font-display text-[26px] font-bold tracking-[-0.8px]">Hola, {nombre}. ¿Qué quieres lograr?</h1>
            <p className="mt-1.5 text-[14px] text-txt-2 dark:text-fg-2">Elige una o varias. Acomodamos tu panel según lo que te importa.</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {METAS.map((m) => {
                const on = metas.includes(m.id);
                const Icon = m.icon;
                return (
                  <button key={m.id} type="button" aria-pressed={on} onClick={() => setMetas((xs) => (on ? xs.filter((x) => x !== m.id) : [...xs, m.id]))} className={cn('flex min-h-[112px] flex-col justify-between rounded-card-lg p-4 text-left transition-all duration-[250ms]', on ? 'text-white shadow-green' : 'bg-surface text-fg shadow-card')} style={on ? { background: 'linear-gradient(135deg, #0B1F17 0%, #15803D 60%, #16A34A 100%)' } : undefined}>
                    <Icon size={22} className={on ? 'text-green-light' : 'text-green'} />
                    <span className="text-[13.5px] font-bold leading-snug">{m.label}</span>
                  </button>
                );
              })}
            </div>
            {metas.length > 0 && (
              <div className="mt-5">
                <div className="section-label mb-2">Lo que se activa en tu panel</div>
                <div className="flex flex-wrap gap-1.5">{METAS.filter((m) => metas.includes(m.id)).map((m) => <span key={m.id} className="rounded-pill bg-green-50 px-3 py-1 text-[11.5px] font-semibold text-green dark:bg-surface-2 dark:text-green-light">{m.activa}</span>)}</div>
              </div>
            )}
          </>
        )}

        {paso === 1 && (
          <>
            <h1 className="font-display text-[26px] font-bold tracking-[-0.8px]">¿Cuándo te pagan?</h1>
            <p className="mt-1.5 text-[14px] text-txt-2 dark:text-fg-2">Tu presupuesto se arma por quincena, no por mes. Toca los días en que recibes tu pago. Si no estás seguro, déjalo así: lo detectamos con tu nómina.</p>
            <div className="mt-6 grid grid-cols-8 gap-1.5">
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
                const on = dias.includes(d);
                return <button key={d} type="button" aria-pressed={on} onClick={() => setDias((xs) => (on ? xs.filter((x) => x !== d) : [...xs, d].sort((a, b) => a - b)))} className={cn('h-10 rounded-[10px] font-display text-[13px] font-bold transition-colors', on ? 'bg-ink text-white dark:bg-white dark:text-ink' : 'bg-surface text-txt-2 shadow-card dark:text-fg-2')}>{d}</button>;
              })}
            </div>
            <div className="mt-5"><Input label="¿Cuánto recibes cada quincena? (opcional)" value={ingreso} onChange={(e) => setIngreso(e.target.value.replace(/[^\d]/g, ''))} inputMode="numeric" placeholder="14500" hint="Si lo dejas vacío lo estimamos con tus depósitos de nómina." className="bg-surface" /></div>
            {error && <p className="mt-3 text-[12.5px] font-semibold text-negative">{error}</p>}
          </>
        )}

        {paso === 2 && (
          <>
            <h1 className="font-display text-[26px] font-bold tracking-[-0.8px]">7 días gratis. Sin tarjeta.</h1>
            <p className="mt-1.5 text-[14px] text-txt-2 dark:text-fg-2">Después, $250 MXN al mes. Cancela cuando quieras desde Ajustes.</p>
            <div className="mt-6 rounded-20 border-2 border-green bg-green-50 p-6 dark:bg-surface-2">
              <div className="text-[12px] font-bold uppercase tracking-[0.9px] text-green">MoneyMaker</div>
              <div className="mt-2 font-display text-[40px] font-bold leading-none tracking-[-1.5px]">$250<span className="text-[16px] font-semibold text-txt-2 dark:text-fg-2"> MXN al mes</span></div>
              <ul className="mt-5 space-y-2 text-[13px]">
                {['Estados de cuenta ilimitados, de todos tus bancos', 'Presupuesto por quincena que se arma con tus datos', 'Suscripciones y meses sin intereses detectados y cancelables', 'Cuánto puedes invertir, cada quincena'].map((b) => <li key={b} className="flex items-start gap-2"><Check size={16} className="mt-0.5 flex-none text-green" /> {b}</li>)}
              </ul>
            </div>
          </>
        )}

        {paso === 3 && (
          <>
            <h1 className="font-display text-[26px] font-bold tracking-[-0.8px]">Sube tu primer estado de cuenta</h1>
            <p className="mt-1.5 text-[14px] text-txt-2 dark:text-fg-2">El PDF que ya te manda tu banco. En dos minutos ves tus suscripciones, tus meses sin intereses y cuánto te queda esta quincena.</p>
            <div className="mt-6 rounded-20 bg-ink p-5 text-white">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-green text-white"><Upload size={22} /></span>
                <div>
                  <div className="font-display text-[17px] font-bold leading-snug">Uno o varios PDFs, de tarjeta o de débito</div>
                  <div className="text-[12.5px] text-white/70">Con contraseña también. Cada archivo se lee en menos de un minuto.</div>
                </div>
              </div>
              <ul className="mt-4 grid gap-2 text-[12.5px] text-white/85 sm:grid-cols-3">
                {[[ShieldCheck, 'Solo lectura'], [FileText, 'El PDF se descarta'], [Lock, 'Sin claves del banco']].map(([I, t]) => {
                  const Icon = I as typeof Lock;
                  return <li key={String(t)} className="flex items-center gap-2"><Icon size={14} className="flex-none text-green-light" /> {String(t)}</li>;
                })}
              </ul>
            </div>
            {resumen && resumen.cuentas > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                {[['Cuentas', String(resumen.cuentas)], ['Movimientos leídos', String(resumen.movimientos)], ['Suscripciones', `${resumen.suscripciones} · ${money(resumen.suscripcionesMensual)}/mes`], ['Meses sin intereses', `${resumen.msi} · ${money(resumen.msiMensual)}/mes`]].map(([l, v]) => (
                  <div key={l} className="rounded-card bg-surface p-4 shadow-card"><div className="text-[11px] font-semibold text-txt-2 dark:text-fg-2">{l}</div><div className="font-display text-[18px] font-bold">{v}</div></div>
                ))}
              </div>
            )}
            <p className="mt-4 text-[12.5px] text-txt-2 dark:text-fg-2">¿No lo tienes a la mano? Entra a tu panel y súbelo cuando quieras desde &ldquo;Agregar cuenta&rdquo;.</p>
          </>
        )}
      </main>

      <footer className="fixed inset-x-0 bottom-0 bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-[640px] items-center gap-3 px-5 py-3.5 pb-[max(14px,env(safe-area-inset-bottom))]">
          {paso === ULTIMO && <button type="button" disabled={pendiente} onClick={() => terminar('/app')} className="text-[13px] font-semibold text-txt-2 dark:text-fg-2">Ver mi panel</button>}
          <Button size="lg" full className="flex-1" disabled={pendiente || (paso === 0 && metas.length === 0)} onClick={siguiente}>
            {pendiente ? 'Un momento…' : paso === 2 ? 'Empezar 7 días gratis' : paso === ULTIMO ? 'Subir estado de cuenta' : 'Continuar'}
          </Button>
        </div>
      </footer>
    </div>
  );
}
