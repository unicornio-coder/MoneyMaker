'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/cn';
import { CATEGORIAS_GASTO } from '@/lib/domain/categorias';
import type { Periodo } from '@/lib/domain/tipos';
import { Panel } from '@/components/ui/Panel';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { agregarLinea } from '@/app/app/presupuesto/acciones';

export function ModalNuevoPresupuesto({ open, onClose, periodo, inicio, existentes }: { open: boolean; onClose: () => void; periodo: Periodo; inicio: string; existentes: string[] }) {
  const disponibles = CATEGORIAS_GASTO.filter((c) => !existentes.includes(c.id));
  const [cat, setCat] = useState(disponibles[0]?.id ?? 'otros');
  const [nombre, setNombre] = useState('');
  const [monto, setMonto] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pendiente, start] = useTransition();
  const router = useRouter();

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const r = await agregarLinea(periodo, inicio, cat, nombre.trim() || null, Number(monto));
      if (!r.ok) setError(r.error);
      else {
        setMonto('');
        setNombre('');
        onClose();
        router.refresh();
      }
    });
  };

  return (
    <Panel open={open} onClose={onClose} mode="modal" title="Nuevo presupuesto">
      <form onSubmit={enviar} className="space-y-3.5 pb-2">
        <div>
          <div className="mb-1.5 text-[12.5px] font-semibold">Categoría</div>
          <div className="flex flex-wrap gap-1.5">
            {disponibles.map((c) => (
              <button key={c.id} type="button" onClick={() => setCat(c.id)} className={cn('inline-flex items-center gap-1.5 rounded-pill border px-3 py-1.5 text-[12px] font-semibold', cat === c.id ? 'border-ink bg-ink text-white dark:border-white dark:bg-white dark:text-ink' : 'border-line-2 dark:border-edge')}>
                <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />{c.nombre}
              </button>
            ))}
            {disponibles.length === 0 && <p className="text-[12.5px] text-txt-2">Todas las categorías ya tienen presupuesto.</p>}
          </div>
        </div>
        <Input label="Nombre (opcional)" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Comidas fuera, gasolina…" />
        <Input label={`Monto por ${periodo === 'q' ? 'quincena' : periodo === 'mes' ? 'mes' : 'año'}`} value={monto} onChange={(e) => setMonto(e.target.value.replace(/[^\d]/g, ''))} inputMode="numeric" placeholder="1500" required />
        {error && <p className="text-[12.5px] font-semibold text-negative">{error}</p>}
        <Button type="submit" variant="green" size="lg" full disabled={pendiente || !disponibles.length || !(Number(monto) > 0)}>{pendiente ? 'Guardando…' : 'Crear'}</Button>
      </form>
    </Panel>
  );
}
