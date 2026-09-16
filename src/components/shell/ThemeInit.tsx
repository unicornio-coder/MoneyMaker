'use client';

import { useEffect } from 'react';
import { useUI } from '@/lib/store/ui';

/** Re-aplica el tema guardado tras la hidratación (el script inline lo pone antes del primer render). */
export function ThemeInit() {
  const setTema = useUI((s) => s.setTema);
  useEffect(() => {
    let guardado: string | null = null;
    try {
      guardado = localStorage.getItem('mm-theme');
    } catch {}
    const oscuro = guardado === 'dark' || (guardado !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
    setTema(oscuro ? 'oscuro' : 'claro');
  }, [setTema]);
  return null;
}
