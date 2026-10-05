'use client';

import { useState, useTransition } from 'react';
import { usePathname } from 'next/navigation';
import { ChevronDown, LifeBuoy, Send, Check } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { reportarProblema, type ResultadoReporte } from '@/app/app/ayuda/acciones';
import { PREGUNTAS } from '@/lib/ayudaPreguntas';


function Pregunta({ q, a }: { q: string; a: string }) {
  const [abierta, setAbierta] = useState(false);
  return (
    <li>
      <button type="button" aria-expanded={abierta} onClick={() => setAbierta((v) => !v)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-bg-hover dark:hover:bg-surface-2">
        <span className="flex-1 text-[14px] font-bold">{q}</span>
        <ChevronDown size={18} className={cn('flex-none text-txt-3 transition-transform', abierta && 'rotate-180')} />
      </button>
      {abierta && <p className="animate-fade px-4 pb-4 text-[13px] leading-relaxed text-txt-2 dark:text-fg-2">{a}</p>}
    </li>
  );
}

/** Centro de ayuda: preguntas frecuentes y reporte de problema que abre un issue solo. */
export function Ayuda() {
  const pathname = usePathname();
  const [asunto, setAsunto] = useState('');
  const [detalle, setDetalle] = useState('');
  const [pantalla, setPantalla] = useState('');
  const [resultado, setResultado] = useState<ResultadoReporte | null>(null);
  const [pendiente, start] = useTransition();

  const enviar = () =>
    start(async () => {
      const r = await reportarProblema(asunto, detalle, pantalla || pathname);
      setResultado(r);
      if (r.ok) {
        setAsunto('');
        setDetalle('');
        setPantalla('');
      }
    });

  return (
    <div className="mx-auto max-w-[680px] space-y-6">
      <section className="space-y-3">
        <h2 className="font-display text-[19px] font-bold tracking-[-0.3px]">Preguntas frecuentes</h2>
        <ul className="card divide-y divide-edge overflow-hidden p-0">
          {PREGUNTAS.map((p) => <Pregunta key={p.q} q={p.q} a={p.a} />)}
        </ul>
      </section>

      <section className="card p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-green-50 text-green-dark dark:bg-surface-2 dark:text-green-light"><LifeBuoy size={19} /></span>
          <div>
            <h2 className="font-display text-[19px] font-bold tracking-[-0.3px]">Reportar un problema</h2>
            <p className="mt-0.5 text-[12.5px] text-txt-2 dark:text-fg-2">Llega directo a nuestro tablero de trabajo. No incluyas contraseñas ni números de tarjeta.</p>
          </div>
        </div>
        {resultado?.ok ? (
          <div className="mt-5 rounded-card bg-green-50 p-4 text-[13px] dark:bg-surface-2" role="status">
            <div className="flex items-center gap-2 font-bold"><Check size={16} className="text-green-dark dark:text-green-light" /> Recibido.</div>
            <p className="mt-1 text-txt-2 dark:text-fg-2">{resultado.via === 'issue' ? 'Ya está en nuestro tablero; puedes seguirlo aquí:' : resultado.via === 'correo' ? 'Nos llegó por correo. Te respondemos al tuyo.' : 'Quedó registrado. Lo revisamos en la siguiente ronda.'}</p>
            {resultado.url && <a href={resultado.url} target="_blank" rel="noreferrer" className="mt-1 inline-block break-all font-semibold text-green-dark underline-offset-4 hover:underline dark:text-green-light">{resultado.url}</a>}
            <button type="button" onClick={() => setResultado(null)} className="mt-3 text-[12.5px] font-semibold text-txt-2 underline-offset-4 hover:underline dark:text-fg-2">Enviar otro</button>
          </div>
        ) : (
          <div className="mt-5 space-y-3.5">
            <Input label="Qué pasó, en pocas palabras" value={asunto} onChange={(e) => setAsunto(e.target.value)} placeholder="No se leyó mi PDF de BBVA" maxLength={120} />
            <label className="block">
              <span className="mb-1 block text-[12px] font-semibold text-txt-2 dark:text-fg-2">Cuéntanos más</span>
              <textarea value={detalle} onChange={(e) => setDetalle(e.target.value)} rows={4} maxLength={2000} placeholder="Qué hiciste, qué esperabas y qué viste. Si hay una referencia de error, pégala." className="input resize-none text-[13.5px]" />
            </label>
            <Input label="Pantalla (opcional)" value={pantalla} onChange={(e) => setPantalla(e.target.value)} placeholder={pathname} />
            {resultado && !resultado.ok && <p className="text-[12.5px] font-semibold text-negative" role="alert" data-testid="error-reporte">{resultado.error}</p>}
            <Button size="lg" full disabled={pendiente} onClick={enviar}><Send size={16} /> {pendiente ? 'Enviando…' : 'Enviar reporte'}</Button>
          </div>
        )}
      </section>
      <p className="text-center text-[12px] text-txt-3">También puedes escribir a <a href="mailto:hola@moneymaker.mx" className="font-semibold text-green-dark dark:text-green-light">hola@moneymaker.mx</a>.</p>
    </div>
  );
}
