'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { ArrowUp, ChevronRight, FileUp, Sparkles, Wallet, Repeat, CalendarClock } from 'lucide-react';
import { formatMXN } from '@/lib/format';
import { cn } from '@/lib/cn';
import { preguntarABilly } from '@/app/app/billy/acciones';

type Mensaje = { de: 'billy' | 'yo'; texto: string };

export type ResumenBilly = { teQueda: number; diasRestantes: number; periodoActual: boolean; periodo: string; totalSuscripciones: number; nSuscripciones: number; totalProximosCobros: number; nCobros: number };

const SUGERENCIAS = ['¿Cuánto me queda?', '¿Cuánto pago de suscripciones?', '¿Qué cobros vienen esta semana?'];

/** Chat con Billy. Empieza solo, con la respuesta a "¿cuánto me queda?"; las cifras salen de Presupuesto y Suscripciones. */
export function Billy({ saludo, hayDatos = true, resumen = null, preguntaInicial }: { saludo: string; hayDatos?: boolean; resumen?: ResumenBilly | null; preguntaInicial?: string }) {
  const [mensajes, setMensajes] = useState<Mensaje[]>([{ de: 'billy', texto: saludo }]);
  const [texto, setTexto] = useState('');
  const [pendiente, start] = useTransition();
  const fin = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fin.current?.scrollIntoView({ block: 'nearest' });
  }, [mensajes, pendiente]);

  // Pregunta que llega desde Inicio (?p=): se hace sola una vez al abrir.
  const preguntada = useRef(false);
  useEffect(() => {
    if (!preguntaInicial || preguntada.current) return;
    preguntada.current = true;
    enviar(preguntaInicial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preguntaInicial]);

  const enviar = (pregunta: string) => {
    const p = pregunta.trim();
    if (!p || pendiente) return;
    setTexto('');
    setMensajes((m) => [...m, { de: 'yo', texto: p }]);
    start(async () => {
      const r = await preguntarABilly(p).catch(() => ({ texto: 'No pude contestar. Revisa tu conexión e intenta de nuevo.' }));
      setMensajes((m) => [...m, { de: 'billy', texto: r.texto }]);
    });
  };

  return (
    <div className="mx-auto grid max-w-[1080px] gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
    <div className="flex min-w-0 flex-col gap-4">
      {/* La barra de arriba ya tiene el título (h1); aquí solo la presentación, y en el teléfono ni eso: el chat primero. */}
      <header className="hidden items-center gap-3 md:flex">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ink text-green-light dark:bg-surface-2"><Sparkles size={20} /></span>
        <div>
          <p className="font-display text-[22px] font-bold tracking-[-0.4px]">Billy</p>
          <p className="text-[12.5px] text-txt-2 dark:text-fg-2">Tu asistente. Contesta con las cifras de tu Presupuesto y tus Suscripciones.</p>
        </div>
      </header>

      <div className="card flex min-h-[260px] flex-col gap-3 p-4 md:min-h-[320px]" role="log" aria-live="polite" aria-label="Conversación con Billy">
        {mensajes.map((m, i) => (
          <p key={i} className={cn('max-w-[85%] whitespace-pre-line rounded-[18px] px-4 py-2.5 text-[14px] leading-relaxed animate-rise', m.de === 'yo' ? 'self-end bg-ink text-white dark:bg-white dark:text-ink' : 'self-start bg-bg-muted text-fg dark:bg-surface-2')}>{m.texto}</p>
        ))}
        {!hayDatos && mensajes.length === 1 && (
          <Link href="/app/importar" className="btn-primary flex h-11 w-fit items-center gap-2 self-start px-5 text-[13px] animate-rise"><FileUp size={16} /> Subir estado de cuenta</Link>
        )}
        {pendiente && <p className="self-start rounded-[18px] bg-bg-muted px-4 py-2.5 text-[14px] text-txt-2 dark:bg-surface-2 dark:text-fg-2">Billy está revisando tus cifras…</p>}
        <div ref={fin} />
      </div>

      <div className="-mx-3.5 flex gap-2 overflow-x-auto px-3.5 pb-0.5 md:mx-0 md:flex-wrap md:px-0">
        {SUGERENCIAS.map((s) => (
          <button key={s} type="button" disabled={pendiente} onClick={() => enviar(s)} className="shrink-0 whitespace-nowrap rounded-pill border border-line-2 bg-surface px-3.5 py-2 text-[12.5px] font-semibold text-fg transition-colors hover:bg-bg-muted disabled:opacity-60 dark:border-edge dark:hover:bg-surface-2">{s}</button>
        ))}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); enviar(texto); }} className="flex items-center gap-2">
        <label className="sr-only" htmlFor="pregunta-billy">Tu pregunta para Billy</label>
        <input id="pregunta-billy" value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={500} placeholder="Pregúntale a Billy" autoComplete="off" className="input h-12 flex-1 text-[14px]" />
        <button type="submit" disabled={pendiente || !texto.trim()} aria-label="Enviar pregunta" className="btn-primary flex h-12 w-12 flex-none items-center justify-center rounded-full disabled:opacity-50"><ArrowUp size={20} /></button>
      </form>
      <p className="text-center text-[11.5px] text-txt-3">Billy no da asesoría de inversión y no guarda lo que le escribes.</p>
    </div>
    {resumen && <LoQueSabe r={resumen} />}
    </div>
  );
}

/** Las tres cifras con las que contesta Billy, ligadas a la pantalla de donde salen. */
function LoQueSabe({ r }: { r: ResumenBilly }) {
  const filas = [
    { icon: Wallet, etiqueta: r.teQueda < 0 ? 'Te pasaste' : 'Te quedan', valor: formatMXN(Math.abs(r.teQueda)), detalle: r.periodoActual ? `${r.diasRestantes === 1 ? '1 día' : `${r.diasRestantes} días`} para tu quincena` : `Último periodo con datos · ${r.periodo}`, href: '/app/presupuesto', destino: 'Presupuesto' },
    { icon: Repeat, etiqueta: 'Suscripciones al mes', valor: formatMXN(r.totalSuscripciones), detalle: r.nSuscripciones === 1 ? '1 suscripción activa' : `${r.nSuscripciones} suscripciones activas`, href: '/app/fijos', destino: 'Suscripciones' },
    { icon: CalendarClock, etiqueta: 'Cobros en 7 días', valor: formatMXN(r.totalProximosCobros), detalle: r.nCobros === 0 ? 'Sin cobros fijos esta semana' : r.nCobros === 1 ? '1 cobro programado' : `${r.nCobros} cobros programados`, href: '/app/fijos', destino: 'Suscripciones' },
  ];
  return (
    <aside className="hidden space-y-3 lg:sticky lg:top-6 lg:block" aria-label="Lo que sabe Billy">
      <div className="rounded-card-xl bg-ink p-5 text-white shadow-dark dark:bg-surface-2 dark:ring-1 dark:ring-white/10">
        <div className="text-[11px] font-bold uppercase tracking-[0.9px] text-green-light">Lo que sabe Billy</div>
        <p className="mt-1 text-[12.5px] leading-relaxed text-white/70">Contesta solo con estas cifras. Son las mismas de tus pantallas.</p>
        <ul className="mt-4 space-y-1">
          {filas.map((f) => {
            const Icon = f.icon;
            return (
              <li key={f.etiqueta}>
                <Link href={f.href} className="group -mx-2 flex items-center gap-3 rounded-card px-2 py-2.5 transition-colors hover:bg-white/5">
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-white/10 text-green-light"><Icon size={16} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11.5px] text-white/60">{f.etiqueta}</span>
                    <span className="block font-display text-[20px] font-bold leading-tight tracking-[-0.4px]">{f.valor}</span>
                    <span className="block truncate text-[11px] text-white/50">{f.detalle}</span>
                  </span>
                  <span className="flex items-center gap-0.5 text-[11px] font-semibold text-white/50 transition-colors group-hover:text-green-light">{f.destino}<ChevronRight size={14} /></span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
