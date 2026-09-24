'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PiggyBank, CreditCard, TrendingUp, Repeat, Users, Home, Check, ChevronLeft, FileText, Lock, ShieldCheck, Upload } from 'lucide-react';
import { cn } from '@/lib/cn';
import { money } from '@/lib/format';
import { Logo } from '@/components/shell/Logo';
import { PanelMarca } from '@/components/auth/PanelMarca';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { actualizarPerfil } from '@/app/app/ajustes/acciones';
import { resumenOnboarding } from '@/app/onboarding/acciones';

// Cuatro pasos, sin conexión bancaria: metas → quincena → plan → primer estado de cuenta.
// La lectura del PDF ocurre en /app/importar, que ya tiene todo el flujo (cola, contraseña, revisión).
// Escritorio: panel de marca a la izquierda (el mismo de login) y los pasos a la derecha. Móvil: una columna.

const METAS = [
  { id: 'ahorrar', label: 'Ahorrar cada quincena', beneficio: 'Te decimos cuánto te sobra antes de gastarlo.', icon: PiggyBank },
  { id: 'deudas', label: 'Salir de deudas', beneficio: 'Tarjetas, meses sin intereses y fechas límite en un lugar.', icon: CreditCard },
  { id: 'invertir', label: 'Invertir mejor', beneficio: 'Cuánto puedes mandar a CETES o GBM+ cada quincena.', icon: TrendingUp },
  { id: 'suscripciones', label: 'Controlar suscripciones', beneficio: 'Cuáles pagas, desde cuándo y cómo cancelarlas.', icon: Repeat },
  { id: 'familia', label: 'Presupuesto familiar', beneficio: 'Gasto por categoría, claro para toda la casa.', icon: Users },
  { id: 'casa', label: 'Comprar casa o auto', beneficio: 'Patrimonio y metas grandes con fecha.', icon: Home },
];

const PASOS = ['Metas', 'Quincena', 'Plan', 'Primer PDF'];
const ULTIMO = PASOS.length - 1;

type Props = {
  /** Nombre real del usuario (perfil o registro); null si solo tenemos el correo. */
  nombre: string | null;
  perfil: { metas: string[]; diasPago: number[]; ingresoQuincenal: number | null };
  pasoInicial: number;
};

export function Onboarding({ nombre: nombreInicial, perfil, pasoInicial }: Props) {
  const [paso, setPaso] = useState(Math.min(ULTIMO, pasoInicial));
  const [nombre, setNombre] = useState(nombreInicial ?? '');
  const [metas, setMetas] = useState<string[]>(perfil.metas);
  const [dias, setDias] = useState<number[]>(perfil.diasPago?.length ? perfil.diasPago : [5, 20]);
  const [ingreso, setIngreso] = useState(perfil.ingresoQuincenal ? String(perfil.ingresoQuincenal) : '');
  const [error, setError] = useState<string | null>(null);
  const [resumen, setResumen] = useState<Awaited<ReturnType<typeof resumenOnboarding>> | null>(null);
  const [pendiente, start] = useTransition();
  const router = useRouter();
  const primerNombre = nombre.trim().split(/\s+/)[0] ?? '';

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
    if (paso === 0) {
      start(async () => {
        const r = await actualizarPerfil(nombre.trim() ? { metas, nombre: nombre.trim() } : { metas });
        if (!r.ok) return setError(r.error ?? 'No se pudo guardar.');
        setPaso(1);
      });
    } else if (paso === 1) {
      if (!dias.length) return setError('Elige al menos un día de pago.');
      start(async () => {
        await actualizarPerfil({ diasPago: dias, ingresoQuincenal: ingreso ? Number(ingreso) : null });
        setPaso(2);
      });
    } else if (paso === 2) setPaso(3);
    else terminar('/app/importar');
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
          <ol className="mx-auto grid max-w-[640px] grid-cols-4 gap-1.5 px-5 pb-3" aria-label="Pasos">
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
              <h1 className="font-display text-[27px] font-bold leading-[1.1] tracking-[-0.9px] md:text-[32px]">{primerNombre ? `Hola, ${primerNombre}. ` : ''}¿Qué quieres lograr?</h1>
              <p className="mt-2 text-[14.5px] leading-relaxed text-txt-2 dark:text-fg-2">Elige una o varias. Acomodamos tu panel según lo que te importa; puedes cambiarlo después.</p>
              {!nombreInicial && (
                <div className="mt-5"><Input label="¿Cómo te llamas?" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Tu nombre" autoComplete="given-name" className="bg-surface" /></div>
              )}
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

          {paso === 1 && (
            <>
              <h1 className="font-display text-[27px] font-bold leading-[1.1] tracking-[-0.9px] md:text-[32px]">¿Cuándo te pagan?</h1>
              <p className="mt-2 text-[14.5px] leading-relaxed text-txt-2 dark:text-fg-2">Tu presupuesto se arma por quincena, no por mes. Toca los días en que recibes tu pago. Si no estás seguro, déjalo así: lo detectamos con tu nómina.</p>
              <div className="mt-6 grid grid-cols-8 gap-1.5">
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
                  const on = dias.includes(d);
                  return <button key={d} type="button" aria-pressed={on} onClick={() => setDias((xs) => (on ? xs.filter((x) => x !== d) : [...xs, d].sort((a, b) => a - b)))} className={cn('h-10 rounded-[10px] font-display text-[13px] font-bold transition-colors', on ? 'bg-ink text-white dark:bg-white dark:text-ink' : 'bg-surface text-txt-2 shadow-card hover:bg-green-50 dark:text-fg-2 dark:hover:bg-surface-2')}>{d}</button>;
                })}
              </div>
              <p className="mt-3 text-[12.5px] text-txt-2 dark:text-fg-2">{dias.length ? `Tu quincena empieza los días ${dias.join(' y ')}.` : 'Elige al menos un día.'}</p>
              <div className="mt-5"><Input label="¿Cuánto recibes cada quincena? (opcional)" value={ingreso} onChange={(e) => setIngreso(e.target.value.replace(/[^\d]/g, ''))} inputMode="numeric" placeholder="14500" hint="Si lo dejas vacío lo estimamos con tus depósitos de nómina." className="bg-surface" /></div>
              {error && <p className="mt-3 text-[12.5px] font-semibold text-negative">{error}</p>}
            </>
          )}

          {paso === 2 && (
            <>
              <h1 className="font-display text-[27px] font-bold leading-[1.1] tracking-[-0.9px] md:text-[32px]">7 días gratis. Sin tarjeta.</h1>
              <p className="mt-2 text-[14.5px] leading-relaxed text-txt-2 dark:text-fg-2">Después, $250 MXN al mes. Cancela cuando quieras desde Ajustes, sin llamadas.</p>
              <div className="mt-6 rounded-card-xl border-2 border-green bg-green-50 p-6 dark:bg-surface-2">
                <div className="text-[12px] font-bold uppercase tracking-[0.9px] text-green-dark dark:text-green-light">MoneyMaker</div>
                <div className="mt-2 font-display text-[44px] font-bold leading-none tracking-[-1.8px]">$250<span className="text-[16px] font-semibold text-txt-2 dark:text-fg-2"> MXN al mes</span></div>
                <div className="mt-1.5 text-[12.5px] text-txt-2 dark:text-fg-2">Menos de $9 al día. Una suscripción olvidada cuesta más.</div>
                <ul className="mt-5 space-y-2.5 text-[13.5px]">
                  {['Estados de cuenta ilimitados, de todos tus bancos', 'Presupuesto por quincena que se arma con tus datos', 'Suscripciones y meses sin intereses detectados y cancelables', 'Cuánto puedes invertir, cada quincena'].map((b) => <li key={b} className="flex items-start gap-2.5"><Check size={17} className="mt-0.5 flex-none text-green-dark dark:text-green-light" /> {b}</li>)}
                </ul>
              </div>
            </>
          )}

          {paso === 3 && (
            <>
              <h1 className="font-display text-[27px] font-bold leading-[1.1] tracking-[-0.9px] md:text-[32px]">Sube tu primer estado de cuenta</h1>
              <p className="mt-2 text-[14.5px] leading-relaxed text-txt-2 dark:text-fg-2">El PDF que ya te manda tu banco. En dos minutos ves tus suscripciones, tus meses sin intereses y cuánto te queda esta quincena.</p>
              <div className="mt-6 rounded-card-xl bg-ink p-5 text-white">
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

        <footer className="sticky bottom-0 border-t border-edge bg-surface/95 backdrop-blur">
          <div className="mx-auto flex max-w-[640px] items-center gap-3 px-5 py-3.5 pb-[max(14px,env(safe-area-inset-bottom))]">
            {paso === ULTIMO && <button type="button" disabled={pendiente} onClick={() => terminar('/app')} className="text-[13px] font-semibold text-txt-2 dark:text-fg-2">Ver mi panel</button>}
            <Button size="lg" full className="flex-1" disabled={pendiente || (paso === 0 && metas.length === 0)} onClick={siguiente}>
              {pendiente ? 'Un momento…' : paso === 0 && metas.length === 0 ? 'Elige al menos una meta' : paso === 2 ? 'Empezar 7 días gratis' : paso === ULTIMO ? 'Subir estado de cuenta' : 'Continuar'}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}
