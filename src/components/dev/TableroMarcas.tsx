'use client';

import { useMemo, useState } from 'react';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { Chip } from '@/components/ui/Chip';
import { logoLocal } from '@/lib/brands';

export type MarcaVista = { nombre: string; dominio: string; grupo: 'bancos' | 'suscripciones' | 'comercios' };

function origen(fuente: string | null): string {
  if (!fuente) return 'iniciales';
  if (fuente.startsWith('/logos/')) return 'local';
  if (fuente.includes('brandfetch')) return 'Brandfetch';
  if (fuente.includes('clearbit')) return 'Clearbit';
  if (fuente.includes('google')) return 'favicon';
  if (fuente.includes('duckduckgo')) return 'DuckDuckGo';
  return 'otra';
}

export function TableroMarcas({ marcas }: { marcas: MarcaVista[] }) {
  const [grupo, setGrupo] = useState<'todos' | MarcaVista['grupo']>('todos');
  const [fuentes, setFuentes] = useState<Record<string, string | null>>({});
  const lista = useMemo(() => marcas.filter((m) => grupo === 'todos' || m.grupo === grupo), [marcas, grupo]);
  const resumen = useMemo(() => {
    const c: Record<string, number> = {};
    for (const m of lista) {
      const o = origen(m.dominio in fuentes ? fuentes[m.dominio] : null);
      c[o] = (c[o] ?? 0) + 1;
    }
    return c;
  }, [lista, fuentes]);
  const locales = marcas.filter((m) => logoLocal(m.dominio)).length;

  return (
    <div className="mx-auto max-w-[960px] space-y-4">
      <div>
        <h1 className="font-display text-[22px] font-bold tracking-[-0.4px]">Marcas y logos</h1>
        <p className="text-[13px] text-txt-2 dark:text-fg-2">{marcas.length} marcas · {locales} con logo local. Corre <code>npm run logos</code> con internet para bajar los que falten a <code>public/logos</code>.</p>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {(['todos', 'bancos', 'suscripciones', 'comercios'] as const).map((g) => (
          <Chip key={g} active={grupo === g} onClick={() => setGrupo(g)} tone="lime">{g[0].toUpperCase() + g.slice(1)}</Chip>
        ))}
        <span className="ml-auto text-[11.5px] text-txt-2 dark:text-fg-2">{Object.entries(resumen).map(([k, v]) => `${k}: ${v}`).join(' · ')}</span>
      </div>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {lista.map((m) => (
          <li key={m.dominio} className="card flex items-center gap-3 p-3">
            <BrandLogo domain={m.dominio} nombre={m.nombre} size={44} logoPct={60} onFuente={(f) => setFuentes((s) => (s[m.dominio] === f ? s : { ...s, [m.dominio]: f }))} />
            <div className="min-w-0">
              <div className="truncate text-[13px] font-bold">{m.nombre}</div>
              <div className="truncate text-[11px] text-txt-2 dark:text-fg-2">{m.dominio}</div>
              <div className="text-[10.5px] font-semibold text-txt-3">{origen(m.dominio in fuentes ? fuentes[m.dominio] : null)}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
