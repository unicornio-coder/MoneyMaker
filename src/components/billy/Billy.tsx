'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { ArrowUp, FileUp, Sparkles } from 'lucide-react';
import { cn } from '@/lib/cn';
import { preguntarABilly } from '@/app/app/billy/acciones';

type Mensaje = { de: 'billy' | 'yo'; texto: string };

const SUGERENCIAS = ['¿Cuánto me queda?', '¿Cuánto pago de suscripciones?', '¿Qué cobros vienen esta semana?'];

/** Chat con Billy. Empieza solo, con la respuesta a "¿cuánto me queda?"; las cifras salen de Presupuesto y Suscripciones. */
export function Billy({ saludo, hayDatos = true }: { saludo: string; hayDatos?: boolean }) {
  const [mensajes, setMensajes] = useState<Mensaje[]>([{ de: 'billy', texto: saludo }]);
  const [texto, setTexto] = useState('');
  const [pendiente, start] = useTransition();
  const fin = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fin.current?.scrollIntoView({ block: 'end' });
  }, [mensajes, pendiente]);

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
    <div className="mx-auto flex max-w-[640px] flex-col gap-4">
      <header className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ink text-green-light dark:bg-surface-2"><Sparkles size={20} /></span>
        <div>
          <h1 className="font-display text-[22px] font-bold tracking-[-0.4px]">Billy</h1>
          <p className="text-[12.5px] text-txt-2 dark:text-fg-2">Tu asistente. Contesta con las cifras de tu Presupuesto y tus Suscripciones.</p>
        </div>
      </header>

      <div className="card flex min-h-[320px] flex-col gap-3 p-4" role="log" aria-live="polite" aria-label="Conversación con Billy">
        {mensajes.map((m, i) => (
          <p key={i} className={cn('max-w-[85%] whitespace-pre-line rounded-[18px] px-4 py-2.5 text-[14px] leading-relaxed animate-rise', m.de === 'yo' ? 'self-end bg-ink text-white dark:bg-white dark:text-ink' : 'self-start bg-bg-muted text-fg dark:bg-surface-2')}>{m.texto}</p>
        ))}
        {!hayDatos && mensajes.length === 1 && (
          <Link href="/app/importar" className="btn-primary flex h-11 w-fit items-center gap-2 self-start px-5 text-[13px] animate-rise"><FileUp size={16} /> Subir estado de cuenta</Link>
        )}
        {pendiente && <p className="self-start rounded-[18px] bg-bg-muted px-4 py-2.5 text-[14px] text-txt-2 dark:bg-surface-2 dark:text-fg-2">Billy está revisando tus cifras…</p>}
        <div ref={fin} />
      </div>

      <div className="flex flex-wrap gap-2">
        {SUGERENCIAS.map((s) => (
          <button key={s} type="button" disabled={pendiente} onClick={() => enviar(s)} className="rounded-pill border border-line-2 bg-surface px-3.5 py-2 text-[12.5px] font-semibold text-fg transition-colors hover:bg-bg-muted disabled:opacity-60 dark:border-edge dark:hover:bg-surface-2">{s}</button>
        ))}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); enviar(texto); }} className="flex items-center gap-2">
        <label className="sr-only" htmlFor="pregunta-billy">Tu pregunta para Billy</label>
        <input id="pregunta-billy" value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={500} placeholder="Pregúntale a Billy" autoComplete="off" className="input h-12 flex-1 text-[14px]" />
        <button type="submit" disabled={pendiente || !texto.trim()} aria-label="Enviar pregunta" className="btn-primary flex h-12 w-12 flex-none items-center justify-center rounded-full disabled:opacity-50"><ArrowUp size={20} /></button>
      </form>
      <p className="text-center text-[11.5px] text-txt-3">Billy no da asesoría de inversión y no guarda lo que le escribes.</p>
    </div>
  );
}
