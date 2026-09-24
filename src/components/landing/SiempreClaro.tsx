'use client';

import { useEffect } from 'react';
import { useUI } from '@/lib/store/ui';

// La landing siempre va en modo día (como Stori y Apple), aunque el sistema o la app estén en oscuro.
// El script inline fija el tema antes del primer pintado; al salir de la landing se restaura el tema del usuario.
const SCRIPT = `document.documentElement.setAttribute('data-theme','light')`;

export function SiempreClaro() {
  const setTema = useUI((s) => s.setTema);
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    return () => {
      let guardado: string | null = null;
      try {
        guardado = localStorage.getItem('mm-theme');
      } catch {}
      const oscuro = guardado === 'dark' || (guardado !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
      setTema(oscuro ? 'oscuro' : 'claro');
    };
  }, [setTema]);
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
