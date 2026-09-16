'use client';

import { create } from 'zustand';

export type Periodo = 'q' | 'mes' | 'anio';
export type Tema = 'claro' | 'oscuro';

type UIState = {
  periodo: Periodo;
  tema: Tema;
  sidebarExpandida: boolean;
  masAbierto: boolean;
  ocultarSaldos: boolean;
  setPeriodo: (p: Periodo) => void;
  setTema: (t: Tema) => void;
  toggleTema: () => void;
  toggleSidebar: () => void;
  setMasAbierto: (v: boolean) => void;
  toggleOcultarSaldos: () => void;
};

function aplicarTema(t: Tema) {
  if (typeof document === 'undefined') return;
  if (t === 'oscuro') document.documentElement.setAttribute('data-theme', 'dark');
  else document.documentElement.removeAttribute('data-theme');
  try {
    localStorage.setItem('mm-theme', t === 'oscuro' ? 'dark' : 'light');
  } catch {}
}

function temaInicial(): Tema {
  if (typeof document === 'undefined') return 'claro';
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'oscuro' : 'claro';
}

export const useUI = create<UIState>((set, get) => ({
  periodo: 'q',
  tema: temaInicial(),
  sidebarExpandida: true,
  masAbierto: false,
  ocultarSaldos: false,
  setPeriodo: (periodo) => set({ periodo }),
  setTema: (tema) => {
    aplicarTema(tema);
    set({ tema });
  },
  toggleTema: () => get().setTema(get().tema === 'oscuro' ? 'claro' : 'oscuro'),
  toggleSidebar: () => set((s) => ({ sidebarExpandida: !s.sidebarExpandida })),
  setMasAbierto: (masAbierto) => set({ masAbierto }),
  toggleOcultarSaldos: () => set((s) => ({ ocultarSaldos: !s.ocultarSaldos })),
}));
