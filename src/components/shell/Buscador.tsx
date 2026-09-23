'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Search } from 'lucide-react';
import { cn } from '@/lib/cn';
import { fechaCorta, money } from '@/lib/format';
import { TABS } from '@/lib/nav';
import { BrandLogo } from '@/components/ui/BrandLogo';

type Mov = { id: string; fecha: string; comercio: string; comercioDominio: string | null; monto: number; tipo: string; cuentaId: string; cuenta: string };
type Resultado = { tipo: 'pagina'; href: string; label: string; icon: (typeof TABS)[number]['icon'] } | { tipo: 'movimiento'; mov: Mov };

/** Búsqueda global (⌘K / Ctrl+K): pantallas y movimientos por comercio. */
export function Buscador({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState('');
  const [movs, setMovs] = useState<Mov[]>([]);
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (open) {
      setQ('');
      setMovs([]);
      setSel(0);
      setTimeout(() => input.current?.focus(), 30);
    }
  }, [open]);

  // Movimientos: consulta con un pequeño retraso para no pedir en cada tecla.
  useEffect(() => {
    if (!open || q.trim().length < 2) {
      setMovs([]);
      return;
    }
    const ctrl = new AbortController();
    const id = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/buscar?q=${encodeURIComponent(q.trim())}`, { signal: ctrl.signal, cache: 'no-store' });
        const json = (await res.json()) as { movimientos?: Mov[] };
        setMovs(json.movimientos ?? []);
      } catch {
        // Cancelado o sin conexión: se deja lo anterior.
      }
    }, 180);
    return () => {
      window.clearTimeout(id);
      ctrl.abort();
    };
  }, [q, open]);

  const resultados = useMemo<Resultado[]>(() => {
    const n = q.trim().toLowerCase();
    const paginas = TABS.filter((t) => t.href !== '/app/planes' && (!n || t.label.toLowerCase().includes(n) || t.titulo.toLowerCase().includes(n))).slice(0, n ? 4 : 6).map((t) => ({ tipo: 'pagina' as const, href: t.href, label: t.label, icon: t.icon }));
    return [...paginas, ...movs.map((mov) => ({ tipo: 'movimiento' as const, mov }))];
  }, [q, movs]);

  useEffect(() => setSel(0), [resultados.length, q]);

  const ir = useCallback(
    (r: Resultado) => {
      onClose();
      router.push(r.tipo === 'pagina' ? r.href : `/app?cuenta=${r.mov.cuentaId}`);
    },
    [onClose, router],
  );

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-ink/40 p-4 pt-[12vh] backdrop-blur-[2px] animate-fade" onClick={onClose} role="presentation">
      <div role="dialog" aria-modal="true" aria-label="Buscar" className="w-full max-w-[560px] overflow-hidden rounded-card-xl bg-surface shadow-dark animate-modal" onClick={(e) => e.stopPropagation()}>
        <label className="flex h-14 items-center gap-3 border-b border-edge px-4">
          <Search size={18} className="flex-none text-txt-3" />
          <input
            ref={input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(resultados.length - 1, s + 1)); }
              if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
              if (e.key === 'Enter' && resultados[sel]) ir(resultados[sel]);
              if (e.key === 'Escape') onClose();
            }}
            placeholder="Busca una pantalla o un comercio (Netflix, Oxxo…)"
            className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-txt-3"
            aria-label="Buscar"
          />
          <kbd className="hidden rounded-[6px] border border-edge px-1.5 py-0.5 text-[10.5px] font-semibold text-txt-3 md:block">esc</kbd>
        </label>
        <ul className="max-h-[60vh] overflow-y-auto py-2" role="listbox">
          {resultados.length === 0 && <li className="px-4 py-6 text-center text-[13px] text-txt-2 dark:text-fg-2">Sin resultados para “{q}”.</li>}
          {resultados.map((r, i) => {
            const activo = i === sel;
            const clase = cn('flex w-full items-center gap-3 px-4 py-2.5 text-left', activo ? 'bg-green-50 dark:bg-surface-2' : 'hover:bg-bg-hover dark:hover:bg-surface-2');
            if (r.tipo === 'pagina') {
              const Icon = r.icon;
              return (
                <li key={r.href} role="option" aria-selected={activo}>
                  <button type="button" onMouseEnter={() => setSel(i)} onClick={() => ir(r)} className={clase}>
                    <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-bg-muted text-txt-2 dark:bg-surface dark:text-fg-2"><Icon size={17} /></span>
                    <span className="flex-1 text-[13.5px] font-semibold">{r.label}</span>
                    <ArrowRight size={15} className="text-txt-3" />
                  </button>
                </li>
              );
            }
            const m = r.mov;
            return (
              <li key={m.id} role="option" aria-selected={activo}>
                <button type="button" onMouseEnter={() => setSel(i)} onClick={() => ir(r)} className={clase}>
                  <BrandLogo domain={m.comercioDominio} nombre={m.comercio} size={36} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-semibold">{m.comercio}</span>
                    <span className="block truncate text-[11.5px] text-txt-2 dark:text-fg-2">{fechaCorta(m.fecha)} · {m.cuenta}</span>
                  </span>
                  <span className={cn('font-display text-[13.5px] font-bold', m.tipo === 'ingreso' && 'text-green')}>{m.tipo === 'ingreso' ? '+' : ''}{money(m.monto)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/** Abre el buscador con ⌘K / Ctrl+K desde cualquier pantalla de la app. */
export function useAtajoBuscar(): [boolean, (v: boolean) => void] {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return [open, setOpen];
}
