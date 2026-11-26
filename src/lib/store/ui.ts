'use client';

import { create } from 'zustand';

export type Periodo = 'q' | 'mes' | 'anio';

type UIState = {
  periodo: Periodo;
  sidebarExpandida: boolean;
  masAbierto: boolean;
  ocultarSaldos: boolean;
  setPeriodo: (p: Periodo) => void;
  toggleSidebar: () => void;
  setMasAbierto: (v: boolean) => void;
  toggleOcultarSaldos: () => void;
};

export const useUI = create<UIState>((set) => ({
  periodo: 'q',
  sidebarExpandida: true,
  masAbierto: false,
  ocultarSaldos: false,
  setPeriodo: (periodo) => set({ periodo }),
  toggleSidebar: () => set((s) => ({ sidebarExpandida: !s.sidebarExpandida })),
  setMasAbierto: (masAbierto) => set({ masAbierto }),
  toggleOcultarSaldos: () => set((s) => ({ ocultarSaldos: !s.ocultarSaldos })),
}));
