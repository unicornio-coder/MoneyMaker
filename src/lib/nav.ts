import type { LucideIcon } from 'lucide-react';
import {
  Home, Repeat, PieChart, Wallet, BarChart3, TrendingUp, Flag, Bell, Upload, Settings, Crown,
} from 'lucide-react';

export type Tab = {
  href: string;
  label: string;
  /** Título de página en la topbar web */
  titulo: string;
  icon: LucideIcon;
  /** Sidebar web: grupo 1 (dinero del día), grupo 2 (patrimonio), 'abajo' (ajustes) o null si no va en la sidebar */
  grupo: 1 | 2 | 'abajo' | null;
  /** Tab bar móvil: etiqueta corta o null si va en la hoja "Más" */
  tabbar: string | null;
};

export const TABS: Tab[] = [
  { href: '/app', label: 'Inicio', titulo: 'Inicio', icon: Home, grupo: 1, tabbar: 'Inicio' },
  { href: '/app/fijos', label: 'Gastos fijos', titulo: 'Gastos fijos', icon: Repeat, grupo: 1, tabbar: 'Fijos' },
  { href: '/app/gastos', label: 'Gastos', titulo: 'Gastos', icon: PieChart, grupo: 1, tabbar: 'Gastos' },
  { href: '/app/presupuesto', label: 'Presupuesto', titulo: 'Presupuesto', icon: Wallet, grupo: 1, tabbar: 'Plan' },
  { href: '/app/patrimonio', label: 'Patrimonio', titulo: 'Patrimonio', icon: BarChart3, grupo: 2, tabbar: null },
  { href: '/app/inversiones', label: 'Inversiones', titulo: 'Inversiones', icon: TrendingUp, grupo: 2, tabbar: null },
  { href: '/app/objetivos', label: 'Objetivos', titulo: 'Objetivos', icon: Flag, grupo: 2, tabbar: null },
  { href: '/app/insights', label: 'Insights', titulo: 'Insights', icon: Bell, grupo: null, tabbar: null },
  { href: '/app/importar', label: 'Importar', titulo: 'Importar estado de cuenta', icon: Upload, grupo: null, tabbar: null },
  { href: '/app/ajustes', label: 'Ajustes', titulo: 'Ajustes', icon: Settings, grupo: 'abajo', tabbar: null },
  { href: '/app/planes', label: 'Planes', titulo: 'Planes', icon: Crown, grupo: null, tabbar: null },
];

/** Orden de la hoja "Más" en móvil. */
export const MAS_ITEMS = ['/app/patrimonio', '/app/inversiones', '/app/objetivos', '/app/insights', '/app/importar', '/app/ajustes']
  .map((h) => TABS.find((t) => t.href === h)!)
  .filter(Boolean);

/** Orden de la tab bar móvil: Inicio, Gastos, [+], Plan, Fijos. */
export const TABBAR_IZQ = ['/app', '/app/gastos'].map((h) => TABS.find((t) => t.href === h)!);
export const TABBAR_DER = ['/app/presupuesto', '/app/fijos'].map((h) => TABS.find((t) => t.href === h)!);

export function tabActual(pathname: string): Tab {
  const exacto = TABS.find((t) => t.href === pathname);
  if (exacto) return exacto;
  const prefijo = TABS.filter((t) => t.href !== '/app' && pathname.startsWith(t.href + '/')).sort((a, b) => b.href.length - a.href.length)[0];
  return prefijo ?? TABS[0];
}
