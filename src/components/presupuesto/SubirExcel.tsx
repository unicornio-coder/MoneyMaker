'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { FileSpreadsheet, Upload } from 'lucide-react';
import { money } from '@/lib/format';
import { categoria } from '@/lib/domain/categorias';
import { iconoCategoria } from '@/lib/domain/categoriaIconos';
import { lineasDesdeFilas, type ResultadoImportacion } from '@/lib/domain/presupuestoExcel';
import type { Periodo } from '@/lib/domain/tipos';
import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { importarLineas } from '@/app/app/presupuesto/acciones';

/** "Subir mi Excel": la hoja se lee en el navegador (nunca sube el archivo), se muestran las categorías y se confirma. */
export function SubirExcel({ open, onClose, periodo, inicio }: { open: boolean; onClose: () => void; periodo: Periodo; inicio: string }) {
  const [resultado, setResultado] = useState<ResultadoImportacion | null>(null);
  const [archivo, setArchivo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [leyendo, setLeyendo] = useState(false);
  const [pendiente, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const leer = async (f: File) => {
    setError(null);
    setLeyendo(true);
    try {
      const XLSX = await import('xlsx');
      const libro = XLSX.read(await f.arrayBuffer(), { type: 'array' });
      const hoja = libro.Sheets[libro.SheetNames[0]];
      const filas = XLSX.utils.sheet_to_json<unknown[]>(hoja, { header: 1, raw: true, defval: null });
      const r = lineasDesdeFilas(filas);
      if (!r.lineas.length) setError('No encontramos filas con concepto y monto. Usa dos columnas: qué y cuánto.');
      setResultado(r);
      setArchivo(f.name);
    } catch {
      setError('No pudimos leer ese archivo. Guarda tu hoja como .xlsx o .csv e inténtalo de nuevo.');
    } finally {
      setLeyendo(false);
    }
  };

  const confirmar = () =>
    start(async () => {
      if (!resultado?.lineas.length) return;
      const res = await importarLineas(periodo, inicio, resultado.lineas.map((l) => ({ categoriaId: l.categoriaId, nombre: l.nombre, limite: l.limite })));
      if (!res.ok) return setError(res.error);
      cerrar();
      router.refresh();
    });

  const cerrar = () => {
    onClose();
    setTimeout(() => { setResultado(null); setArchivo(null); setError(null); }, 200);
  };

  return (
    <Panel open={open} onClose={cerrar} mode="modal" title="Subir mi Excel">
      <div className="space-y-4 pb-2">
        {!resultado ? (
          <>
            <p className="text-[13px] text-txt-2 dark:text-fg-2">Dos columnas bastan: qué (renta, súper, gasolina…) y cuánto. Leemos la hoja aquí mismo; el archivo no se sube a ningún lado.</p>
            <input ref={input} type="file" accept=".xlsx,.xls,.csv" className="hidden" data-testid="input-excel" onChange={(e) => { const f = e.target.files?.[0]; if (f) void leer(f); e.target.value = ''; }} />
            <button type="button" onClick={() => input.current?.click()} disabled={leyendo} className="flex w-full flex-col items-center justify-center gap-2 rounded-card-lg border-2 border-dashed border-line-dashed py-10 text-center transition-colors hover:bg-bg-hover dark:border-edge-2 dark:hover:bg-surface-2">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-green text-white"><FileSpreadsheet size={22} /></span>
              <span className="text-[14px] font-bold">{leyendo ? 'Leyendo…' : 'Elegir archivo'}</span>
              <span className="text-[11.5px] text-txt-3">.xlsx o .csv</span>
            </button>
            {error && <p className="text-[12.5px] font-semibold text-negative">{error}</p>}
          </>
        ) : (
          <>
            <p className="text-[13px] text-txt-2 dark:text-fg-2"><b className="text-fg">{archivo}</b> · {resultado.lineas.length} {resultado.lineas.length === 1 ? 'categoría' : 'categorías'} · {money(resultado.lineas.reduce((s, l) => s + l.limite, 0))} al periodo</p>
            <ul className="max-h-[40dvh] divide-y divide-edge overflow-y-auto rounded-card border border-edge">
              {resultado.lineas.map((l) => {
                const Icon = iconoCategoria(l.categoriaId);
                const cat = categoria(l.categoriaId);
                return (
                  <li key={l.categoriaId} className="flex items-center gap-3 px-3 py-2.5">
                    <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-white" style={{ background: cat.color }}><Icon size={15} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-bold">{cat.nombre}</span>
                      <span className="block truncate text-[11px] text-txt-3">{l.origen}</span>
                    </span>
                    <span className="font-display text-[14px] font-bold">{money(l.limite)}</span>
                  </li>
                );
              })}
            </ul>
            {resultado.sinMonto.length > 0 && <p className="text-[11.5px] text-txt-3">Sin monto, se omiten: {resultado.sinMonto.slice(0, 5).join(', ')}{resultado.sinMonto.length > 5 ? '…' : ''}</p>}
            {error && <p className="text-[12.5px] font-semibold text-negative">{error}</p>}
            <p className="text-[11.5px] text-txt-3">Al confirmar, este presupuesto queda solo con las categorías de tu hoja. Puedes ajustar los montos después.</p>
            <div className="flex gap-2">
              <Button variant="outline" size="lg" className="flex-1" onClick={() => { setResultado(null); setArchivo(null); }}>Otro archivo</Button>
              <Button variant="green" size="lg" className="flex-1" disabled={pendiente || !resultado.lineas.length} onClick={confirmar}><Upload size={16} /> {pendiente ? 'Guardando…' : 'Usar este presupuesto'}</Button>
            </div>
          </>
        )}
      </div>
    </Panel>
  );
}
