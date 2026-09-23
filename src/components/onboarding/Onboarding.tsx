'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { PiggyBank, CreditCard, TrendingUp, Repeat, Users, Home, Search, Check, Upload, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/cn';
import { money } from '@/lib/format';
import { Logo } from '@/components/shell/Logo';
import { Avatar } from '@/components/ui/Avatar';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { actualizarPerfil } from '@/app/app/ajustes/acciones';
import { conectarInstitucion, registrarLinkBelvo, type ResultadoConexion } from '@/app/app/acciones';
import { ConectandoBanco, type EstadoConexion } from '@/components/cuentas/ConectandoBanco';
import { resumenOnboarding } from '@/app/onboarding/acciones';
import { abrirWidgetBelvo } from '@/components/cuentas/belvoWidget';
import type { DatosInicio } from '@/components/inicio/tipos';

const METAS = [
  { id: 'ahorrar', label: 'Ahorrar cada quincena', icon: PiggyBank, activa: 'Objetivos de ahorro y "puedes invertir $X"' },
  { id: 'deudas', label: 'Salir de deudas', icon: CreditCard, activa: 'Tarjetas, MSI y fechas límite en Inicio' },
  { id: 'invertir', label: 'Invertir mejor', icon: TrendingUp, activa: 'Inversiones y rendimiento por cuenta' },
  { id: 'suscripciones', label: 'Controlar suscripciones', icon: Repeat, activa: 'Detección y cancelación de suscripciones' },
  { id: 'familia', label: 'Presupuesto familiar', icon: Users, activa: 'Presupuesto por categoría y por integrante' },
  { id: 'casa', label: 'Comprar casa o auto', icon: Home, activa: 'Patrimonio y metas grandes' },
];

const PASOS = ['Metas', 'Cuentas', 'Quincena', 'Plan', 'Resumen'];

type Props = { nombre: string; perfil: { metas: string[]; diasPago: number[]; ingresoQuincenal: number | null }; instituciones: DatosInicio['instituciones']; agregador: 'belvo' | 'mock'; sandbox?: boolean; pasoInicial: number };

export function Onboarding({ nombre, perfil, instituciones, agregador, sandbox, pasoInicial }: Props) {
  const [paso, setPaso] = useState(pasoInicial);
  const [metas, setMetas] = useState<string[]>(perfil.metas);
  const [dias, setDias] = useState<number[]>(perfil.diasPago?.length ? perfil.diasPago : [5, 20]);
  const [ingreso, setIngreso] = useState(perfil.ingresoQuincenal ? String(perfil.ingresoQuincenal) : '');
  const [conectadas, setConectadas] = useState<string[]>([]);
  const [q, setQ] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [estado, setEstado] = useState('');
  const [conexion, setConexion] = useState<{ banco: { nombre: string; dominio?: string | null }; estado: EstadoConexion; resultado?: ResultadoConexion | null; error?: string | null } | null>(null);
  const [resumen, setResumen] = useState<Awaited<ReturnType<typeof resumenOnboarding>> | null>(null);
  const [pendiente, start] = useTransition();
  const router = useRouter();

  const lista = useMemo(() => instituciones.filter((i) => !q.trim() || i.nombre.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 12), [instituciones, q]);

  useEffect(() => {
    if (paso === 4) resumenOnboarding().then(setResumen).catch(() => setResumen(null));
  }, [paso]);

  const siguiente = () => {
    setError(null);
    if (paso === 0) start(async () => { await actualizarPerfil({ metas }); setPaso(1); });
    else if (paso === 2) {
      if (!dias.length) return setError('Elige al menos un día de pago.');
      start(async () => { await actualizarPerfil({ diasPago: dias, ingresoQuincenal: ingreso ? Number(ingreso) : null }); setPaso(3); });
    } else if (paso === 4) start(async () => { await actualizarPerfil({ onboardingCompleto: true }); router.push('/app'); router.refresh(); });
    else setPaso((p) => Math.min(4, p + 1));
  };

  const conectar = (inst: DatosInicio['instituciones'][number]) => {
    setError(null);
    if (!inst.automatica) return router.push(`/app/importar?banco=${encodeURIComponent(inst.nombre)}`);
    if (agregador === 'belvo') {
      abrirWidgetBelvo({
        institucion: inst.origen === 'belvo' && !sandbox ? inst.id : undefined,
        onEstado: setEstado,
        onSuccess: (link, institution) => {
          setEstado('');
          setConexion({ banco: { nombre: inst.nombre, dominio: inst.dominio }, estado: 'proceso' });
          start(async () => {
            const r = await registrarLinkBelvo(link, institution);
            if (r.ok) setConectadas((c) => [...c, inst.nombre]);
            setConexion((c) => c && (r.ok ? { ...c, estado: 'listo', resultado: r.resultado } : { ...c, estado: 'error', error: r.error }));
          });
        },
        onExit: () => setEstado(''),
        onError: setError,
      });
      return;
    }
    setConexion({ banco: { nombre: inst.nombre, dominio: inst.dominio }, estado: 'proceso' });
    start(async () => {
      const r = await conectarInstitucion(inst.id, inst.nombre);
      if (r.ok) setConectadas((c) => [...c, inst.nombre]);
      setConexion((c) => c && (r.ok ? { ...c, estado: 'listo', resultado: r.resultado } : { ...c, estado: 'error', error: r.error }));
    });
  };

  return (
    <div className="min-h-dvh bg-bg-input dark:bg-canvas">
      {conexion && (
        <ConectandoBanco banco={conexion.banco} estado={conexion.estado} resultado={conexion.resultado} error={conexion.error} ctaListo="Conectar otra o continuar" onCerrar={() => setConexion(null)} onListo={() => setConexion(null)} />
      )}
      <header className="sticky top-0 z-10 bg-surface">
        <div className="mx-auto flex h-[64px] max-w-[640px] items-center gap-3 px-5">
          {paso > 0 ? <button type="button" onClick={() => setPaso((p) => p - 1)} aria-label="Atrás" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-bg-muted"><ChevronLeft size={18} /></button> : <Logo />}
          <div className="flex-1 text-[12.5px] font-semibold text-txt-2 dark:text-fg-2">Paso {paso + 1} de 5 · {PASOS[paso]}</div>
        </div>
        <div className="mx-auto h-1 max-w-[640px] bg-line dark:bg-surface-2"><div className="h-1 bg-green transition-[width] duration-[400ms] ease-out" style={{ width: `${((paso + 1) / 5) * 100}%` }} /></div>
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
                  <button key={m.id} type="button" onClick={() => setMetas((xs) => (on ? xs.filter((x) => x !== m.id) : [...xs, m.id]))} className={cn('flex min-h-[112px] flex-col justify-between rounded-card-lg p-4 text-left transition-all duration-[250ms]', on ? 'text-white shadow-green' : 'bg-surface text-fg shadow-card')} style={on ? { background: 'linear-gradient(135deg, #0B1F17 0%, #15803D 60%, #16A34A 100%)' } : undefined}>
                    <Icon size={22} className={on ? 'text-green-light' : 'text-green'} />
                    <span className="text-[13.5px] font-bold leading-snug">{m.label}</span>
                  </button>
                );
              })}
            </div>
            {metas.length > 0 && (
              <div className="mt-5">
                <div className="section-label mb-2">Lo que se activa en tu panel</div>
                <div className="flex flex-wrap gap-1.5">{METAS.filter((m) => metas.includes(m.id)).map((m) => <span key={m.id} className="rounded-pill bg-green-50 px-3 py-1 text-[11.5px] font-semibold text-green dark:bg-surface-2">{m.activa}</span>)}</div>
              </div>
            )}
          </>
        )}

        {paso === 1 && (
          <>
            <h1 className="font-display text-[26px] font-bold tracking-[-0.8px]">Conecta tus cuentas</h1>
            <p className="mt-1.5 text-[14px] text-txt-2 dark:text-fg-2">Solo lectura vía Belvo. Nunca guardamos tus claves. Puedes conectar más después.</p>
            <label className="relative mt-5 block">
              <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-txt-3" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Busca tu banco" className="input bg-surface pl-11 text-[14px]" />
            </label>
            <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {lista.map((i, idx) => {
                const ok = conectadas.includes(i.nombre);
                return (
                  <li key={i.id} className="animate-rise" style={{ animationDelay: `${idx * 40}ms` }}>
                    <button type="button" disabled={ok || pendiente} onClick={() => conectar(i)} className={cn('flex h-[64px] w-full items-center gap-2.5 rounded-card bg-surface px-3 text-left shadow-card transition-transform hover:-translate-y-0.5', ok && 'ring-2 ring-green')}>
                      <Avatar domain={i.dominio} nombre={i.nombre} size={36} logoPct={60} />
                      <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-bold">{i.nombre}</span><span className="block text-[10.5px] text-txt-2 dark:text-fg-2">{ok ? 'Conectada' : i.automatica ? 'Conectar' : 'Estado de cuenta'}</span></span>
                      {ok ? <Check size={16} className="text-green" /> : !i.automatica ? <Upload size={14} className="text-txt-3" /> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
            {agregador === 'belvo' && sandbox && (
              <p className="mt-3 rounded-input bg-surface px-3 py-2 text-[12px] text-txt-2 shadow-card dark:text-fg-2">Modo de prueba de Belvo: en la ventana que se abre elige cualquier banco y entra con usuario <span className="font-semibold text-fg">bnk100</span> y contraseña <span className="font-semibold text-fg">full</span>.</p>
            )}
            {estado && <p className="mt-3 text-[12.5px] font-semibold text-green">{estado}</p>}
            {error && <p className="mt-3 text-[12.5px] font-semibold text-negative">{error}</p>}
            {pendiente && !estado && <p className="mt-3 text-[12.5px] font-semibold text-green">Conectando y leyendo movimientos…</p>}
          </>
        )}

        {paso === 2 && (
          <>
            <h1 className="font-display text-[26px] font-bold tracking-[-0.8px]">¿Cuándo te pagan?</h1>
            <p className="mt-1.5 text-[14px] text-txt-2 dark:text-fg-2">Tu presupuesto se arma por quincena, no por mes. Toca los días en que recibes tu pago.</p>
            <div className="mt-6 grid grid-cols-8 gap-1.5">
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
                const on = dias.includes(d);
                return <button key={d} type="button" onClick={() => setDias((xs) => (on ? xs.filter((x) => x !== d) : [...xs, d].sort((a, b) => a - b)))} className={cn('h-10 rounded-[10px] font-display text-[13px] font-bold transition-colors', on ? 'bg-ink text-white dark:bg-white dark:text-ink' : 'bg-surface text-txt-2 shadow-card')}>{d}</button>;
              })}
            </div>
            <div className="mt-5"><Input label="¿Cuánto recibes cada quincena? (opcional)" value={ingreso} onChange={(e) => setIngreso(e.target.value.replace(/[^\d]/g, ''))} inputMode="numeric" placeholder="14500" hint="Si lo dejas vacío lo estimamos con tus depósitos de nómina." className="bg-surface" /></div>
            {error && <p className="mt-3 text-[12.5px] font-semibold text-negative">{error}</p>}
          </>
        )}

        {paso === 3 && (
          <>
            <h1 className="font-display text-[26px] font-bold tracking-[-0.8px]">7 días gratis. Sin tarjeta.</h1>
            <p className="mt-1.5 text-[14px] text-txt-2 dark:text-fg-2">Después, $250 MXN al mes. Cancela cuando quieras desde Ajustes.</p>
            <div className="mt-6 rounded-20 border-2 border-green bg-green-50 p-6 dark:bg-surface-2">
              <div className="text-[12px] font-bold uppercase tracking-[0.9px] text-green">Premium</div>
              <div className="mt-2 font-display text-[40px] font-bold leading-none tracking-[-1.5px]">$250<span className="text-[16px] font-semibold text-txt-2 dark:text-fg-2"> MXN/mes</span></div>
              <ul className="mt-5 space-y-2 text-[13px]">
                {['Todas tus cuentas en un lugar', 'Presupuesto por quincena automático', 'Suscripciones y MSI detectados y cancelables', 'Insights: cuánto puedes invertir cada quincena'].map((b) => <li key={b} className="flex items-start gap-2"><Check size={16} className="mt-0.5 flex-none text-green" /> {b}</li>)}
              </ul>
            </div>
          </>
        )}

        {paso === 4 && (
          <>
            <h1 className="font-display text-[26px] font-bold tracking-[-0.8px]">Esto es lo que encontramos</h1>
            <p className="mt-1.5 text-[14px] text-txt-2 dark:text-fg-2">Tu panel ya está listo. Puedes ajustar todo después.</p>
            {!resumen ? (
              <p className="mt-6 text-[13px] text-txt-2">Calculando…</p>
            ) : (
              <div className="mt-6 space-y-3">
                {resumen.cuentas > 0 && resumen.ingresoQuincenal > 0 ? (
                  <div className="rounded-20 bg-ink p-5 text-white">
                    <div className="text-[12px] font-semibold text-green-light">Puedes invertir esta quincena</div>
                    <div className="font-display text-[36px] font-bold tracking-[-1.2px]">{money(resumen.excedente)}</div>
                    <div className="text-[12px] text-white/70">Ingreso {money(resumen.ingresoQuincenal)} − fijos, MSI y tu gasto habitual</div>
                  </div>
                ) : (
                  <div className="rounded-20 bg-ink p-5 text-white">
                    <div className="text-[12px] font-semibold text-green-light">Cuánto puedes invertir</div>
                    <div className="font-display text-[20px] font-bold leading-snug">Lo calculamos con tu primer estado de cuenta</div>
                    <div className="mt-1 text-[12px] text-white/70">Ingreso − fijos, meses sin intereses y tu gasto habitual, cada quincena.</div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  {[['Cuentas conectadas', String(resumen.cuentas)], ['Movimientos leídos', String(resumen.movimientos)], ['Suscripciones', `${resumen.suscripciones} · ${money(resumen.suscripcionesMensual)}/mes`], ['Meses sin intereses', `${resumen.msi} · ${money(resumen.msiMensual)}/mes`]].map(([l, v]) => (
                    <div key={l} className="rounded-card bg-surface p-4 shadow-card"><div className="text-[11px] font-semibold text-txt-2 dark:text-fg-2">{l}</div><div className="font-display text-[18px] font-bold">{v}</div></div>
                  ))}
                </div>
                {resumen.cuentas === 0 && <p className="text-[12.5px] text-txt-2 dark:text-fg-2">Aún no conectaste cuentas: entra a tu panel y súbelas cuando quieras.</p>}
              </div>
            )}
          </>
        )}
      </main>

      <footer className="fixed inset-x-0 bottom-0 bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-[640px] items-center gap-3 px-5 py-3.5 pb-[max(14px,env(safe-area-inset-bottom))]">
          {paso === 1 && <button type="button" onClick={() => setPaso(2)} className="text-[13px] font-semibold text-txt-2 dark:text-fg-2">Saltar por ahora</button>}
          <Button size="lg" full className="flex-1" disabled={pendiente || (paso === 0 && metas.length === 0)} onClick={siguiente}>
            {pendiente ? 'Un momento…' : paso === 3 ? 'Empezar 7 días gratis' : paso === 4 ? 'Entrar a mi panel' : 'Continuar'}
          </Button>
        </div>
      </footer>
    </div>
  );
}
