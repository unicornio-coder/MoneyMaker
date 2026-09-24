'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Banknote, Plus } from 'lucide-react';
import { agregarEfectivo } from '@/app/app/acciones';

export function AgregarEfectivo() {
  const [concepto, setConcepto] = useState('');
  const [monto, setMonto] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [pendiente, start] = useTransition();
  const router = useRouter();

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const r = await agregarEfectivo(concepto, Number(monto));
      if (!r.ok) setError(r.error);
      else {
        setConcepto('');
        setMonto('');
        setAbierto(false);
        router.refresh();
      }
    });
  };

  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)} className="flex h-11 w-full items-center justify-center gap-2 rounded-card border border-dashed border-line-dashed text-[12.5px] font-semibold text-txt-2 transition-colors hover:border-green hover:text-green dark:border-edge-2 dark:text-fg-2">
        <Plus size={15} /> Anotar un gasto en efectivo
      </button>
    );
  }

  return (
    <form onSubmit={enviar} className="card relative flex flex-nowrap items-center gap-2 p-3">
      <span className="hidden h-10 w-10 flex-none items-center justify-center rounded-full bg-green-50 text-green-dark dark:bg-surface-2 dark:text-green-light sm:flex"><Banknote size={18} /></span>
      <input value={concepto} onChange={(e) => setConcepto(e.target.value)} autoFocus placeholder="¿En qué?" className="input h-10 min-w-0 flex-1 py-0 text-[13px]" />
      <input value={monto} onChange={(e) => setMonto(e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal" placeholder="$ monto" className="input h-10 w-[84px] flex-none py-0 text-[13px] md:w-[110px]" />
      <button type="submit" disabled={pendiente || !concepto.trim() || !(Number(monto) > 0)} className="h-10 flex-none rounded-pill bg-green px-3.5 text-[12.5px] font-semibold text-white hover:bg-green-dark disabled:bg-line-dashed">
        {pendiente ? 'Guardando…' : 'Agregar'}
      </button>
      <button type="button" onClick={() => setAbierto(false)} className="h-10 flex-none px-2 text-[12.5px] font-semibold text-txt-2 dark:text-fg-2">Cerrar</button>
      {error && <span className="absolute -bottom-5 left-3 text-[12px] font-semibold text-negative">{error}</span>}
    </form>
  );
}
