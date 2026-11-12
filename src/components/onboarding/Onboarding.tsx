'use client';

import { useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PiggyBank, CreditCard, TrendingUp, Repeat, Users, Home, ChevronLeft, FileUp, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Logo } from '@/components/shell/Logo';
import { PanelMarca } from '@/components/auth/PanelMarca';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { dejarArchivosPendientes } from '@/lib/archivosPendientes';
import { actualizarPerfil } from '@/app/app/ajustes/acciones';
import { crearContraseña } from '@/lib/auth/actions';
import type { DatosInicio } from '@/components/inicio/tipos';

// Pasos: tu cuenta (solo si falta el nombre o la contraseña; quien se registró ya los dio) → metas en orden de
// importancia → subir el estado de cuenta. Sin "saltar": sin una fuente de datos no hay panel.

const METAS = [
  { id: 'ahorrar', label: 'Ahorrar cada quincena', beneficio: 'Te decimos cuánto te sobra antes de gastarlo.', icon: PiggyBank },
  { id: 'deudas', label: 'Salir de deudas', beneficio: 'Tarjetas, meses sin intereses y fechas límite en un lugar.', icon: CreditCard },
  { id: 'invertir', label: 'Invertir mejor', beneficio: 'Cuánto puedes mandar a CETES o GBM+ cada quincena.', icon: TrendingUp },
  { id: 'suscripciones', label: 'Controlar suscripciones', beneficio: 'Cuáles pagas, desde cuándo y cómo cancelarlas.', icon: Repeat },
  { id: 'familia', label: 'Presupuesto familiar', beneficio: 'Gasto por categoría, claro para toda la casa.', icon: Users },
  { id: 'casa', label: 'Comprar casa o auto', beneficio: 'Patrimonio y metas grandes con fecha.', icon: Home },
];

const PASOS = ['Tu cuenta', 'Metas', 'Estado de cuenta'];
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

export function Onboarding({ nombre: nombreInicial, perfil, pasoInicial, tieneContraseña }: Props) {
  // Quien ya dio nombre y contraseña al registrarse no vuelve a ver ese paso.
  const primero = nombreInicial && tieneContraseña ? 1 : 0;
  const visibles = PASOS.slice(primero);
  const [paso, setPaso] = useState(Math.max(primero, Math.min(ULTIMO, pasoInicial)));
  const archivoRef = useRef<HTMLInputElement>(null);
  const [nombre, setNombre] = useState(nombreInicial ?? '');
  const [password, setPassword] = useState('');
  const [ver, setVer] = useState(false);
  const [metas, setMetas] = useState<string[]>(perfil.metas);
  const [error, setError] = useState<string | null>(null);
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
            {paso > primero ? (
              <button type="button" onClick={() => setPaso((p) => p - 1)} aria-label="Atrás" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-bg-muted dark:hover:bg-surface-2"><ChevronLeft size={18} /></button>
            ) : (
              <Link href="/" className="flex items-center gap-2" aria-label="MoneyMaker"><Logo /><span className="font-display text-[14px] font-bold lg:hidden">MoneyMaker</span></Link>
            )}
            <div className="ml-auto text-[12px] font-semibold text-txt-2 dark:text-fg-2">Paso {paso - primero + 1} de {visibles.length}</div>
          </div>
          <ol className="mx-auto grid max-w-[640px] gap-1.5 px-5 pb-3" style={{ gridTemplateColumns: `repeat(${visibles.length}, minmax(0, 1fr))` }} aria-label="Pasos">
            {visibles.map((p, j) => {
              const i = j + primero;
              return (
              <li key={p} className="min-w-0">
                <div className={cn('h-1 rounded-pill transition-colors duration-300', i <= paso ? 'bg-green' : 'bg-line dark:bg-surface-2')} />
                <div className={cn('mt-1.5 truncate text-[10.5px] font-semibold', i === paso ? 'text-fg' : 'text-txt-3')} aria-current={i === paso ? 'step' : undefined}>{p}</div>
              </li>
              );
            })}
          </ol>
        </header>

        <main className="mx-auto w-full max-w-[640px] flex-1 animate-screen px-5 pb-8 pt-7 md:pt-9" key={paso}>
          {paso === 0 && (
            <>
              <h1 className="font-display text-[28px] font-bold leading-[1.1] tracking-[-0.9px] md:text-[34px]">Te damos la bienvenida a MoneyMaker</h1>
              <p className="mt-2 text-[14.5px] leading-relaxed text-txt-2 dark:text-fg-2">Dinos cómo te llamas. Si todavía no tienes contraseña, créala aquí para entrar la próxima vez.</p>
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
              <p className="mt-2 text-[14.5px] leading-relaxed text-txt-2 dark:text-fg-2">Tócalas en orden de importancia: con ese orden acomodamos tu pantalla de inicio. Puedes cambiarlo después.</p>
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
                      <span className={cn('absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full font-display text-[12px] font-bold transition-all', on ? 'bg-green-light text-ink' : 'border border-line-2 dark:border-edge-2')} aria-hidden>{on ? metas.indexOf(m.id) + 1 : ''}</span>
                    </button>
                  );
                })}
              </div>
              {error && <p className="mt-3 text-[12.5px] font-semibold text-negative">{error}</p>}
            </>
          )}

          {paso === 2 && (
            <>
              <h1 className="font-display text-[28px] font-bold leading-[1.1] tracking-[-0.9px] md:text-[34px]">Sube tu estado de cuenta</h1>
              <p className="mt-2 text-[14.5px] leading-relaxed text-txt-2 dark:text-fg-2">Es el archivo que tu banco te manda cada mes. Con uno basta para empezar; después puedes subir más.</p>
              <input
                ref={archivoRef}
                type="file"
                multiple
                accept=".pdf,.csv,.txt,.xlsx,.xls,.docx,application/pdf"
                className="hidden"
                data-testid="onboarding-archivo"
                onChange={(e) => {
                  const elegidos = Array.from(e.target.files ?? []);
                  if (!elegidos.length) return;
                  dejarArchivosPendientes(elegidos);
                  terminar('/app/importar');
                }}
              />
              <button type="button" disabled={pendiente} onClick={() => archivoRef.current?.click()} className="mt-6 flex w-full items-center gap-4 rounded-card-xl bg-ink p-5 text-left text-white shadow-dark transition-transform hover:-translate-y-0.5 dark:bg-surface-2 dark:ring-1 dark:ring-white/10">
                <span className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-green text-white"><FileUp size={22} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-[18px] font-bold leading-snug">{pendiente ? 'Abriendo tu panel…' : 'Subir estado de cuenta'}</span>
                  <span className="mt-0.5 block text-[12.5px] text-white/70">PDF, Excel, CSV o Word. Se lee y se descarta.</span>
                </span>
              </button>
              <ol className="mt-5 space-y-2 text-[13px] text-txt-2 dark:text-fg-2">
                {['Eliges el archivo desde tu teléfono o computadora.', 'Lo leemos en un par de minutos, aquí mismo.', 'Revisas lo que encontramos y lo guardas.'].map((t, i) => (
                  <li key={t} className="flex items-center gap-3"><span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-green-50 font-display text-[12px] font-bold text-green-dark dark:bg-surface-2 dark:text-green-light">{i + 1}</span>{t}</li>
                ))}
              </ol>
              <p className="mt-5 flex items-center justify-center gap-1.5 text-[12px] text-txt-3"><ShieldCheck size={14} /> Solo lectura. Nunca pedimos las claves de tu banco.</p>
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
