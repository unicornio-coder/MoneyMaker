'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileText, Loader2 } from 'lucide-react';
import type { Importacion } from '@/lib/domain/tipos';
import { pluralize } from '@/lib/format';

type Pendientes = { procesando: number; revisar: number };

/**
 * Aviso persistente mientras un estado de cuenta se lee en segundo plano (o quedó listo para revisar) y el usuario
 * navegó a otra pantalla. Consulta el estado cada 4 s solo mientras haya lecturas en curso.
 */
export function BannerImportacion({ inicial }: { inicial: Pendientes }) {
  const [p, setP] = useState<Pendientes>(inicial);
  const pathname = usePathname();

  useEffect(() => {
    if (p.procesando === 0) return;
    let vivo = true;
    const consultar = async () => {
      try {
        const res = await fetch('/api/imports', { cache: 'no-store' });
        const json = (await res.json()) as { importaciones?: Importacion[] };
        if (!vivo || !json.importaciones) return;
        setP({ procesando: json.importaciones.filter((i) => i.estado === 'procesando').length, revisar: json.importaciones.filter((i) => i.estado === 'revisar').length });
      } catch {
        // Se vuelve a intentar en el siguiente ciclo.
      }
    };
    const id = window.setInterval(consultar, 4000);
    return () => {
      vivo = false;
      window.clearInterval(id);
    };
  }, [p.procesando]);

  if (pathname?.startsWith('/app/importar')) return null;
  if (p.procesando === 0 && p.revisar === 0) return null;
  const leyendo = p.procesando > 0;
  return (
    <Link
      href="/app/importar"
      className="fixed left-1/2 top-[66px] z-30 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-pill bg-ink px-4 py-2 text-[12px] font-semibold text-white shadow-dark animate-rise dark:bg-white dark:text-ink md:top-[62px]"
      data-testid="banner-importacion"
    >
      {leyendo ? <Loader2 size={14} className="animate-spin text-green-light" /> : <FileText size={14} className="text-green-light" />}
      {leyendo ? `Leyendo ${pluralize(p.procesando, 'estado de cuenta', 'estados de cuenta')}…` : `${pluralize(p.revisar, 'estado de cuenta listo', 'estados de cuenta listos')} para revisar`}
      <span className="text-green-light">{leyendo ? 'Ver' : 'Revisar'}</span>
    </Link>
  );
}
