// Icono por categoría (lucide). Solo para la UI; el catálogo de categorías sigue en `categorias.ts`.

import type { LucideIcon } from 'lucide-react';
import { Repeat, UtensilsCrossed, ShoppingCart, Car, ShoppingBag, Clapperboard, HeartPulse, Plug, Tv, CalendarClock, GraduationCap, Percent, Banknote, Plane, Home, CircleDot, Briefcase, ArrowDownLeft, TrendingUp, CreditCard, ArrowLeftRight, PiggyBank } from 'lucide-react';

const ICONOS: Record<string, LucideIcon> = {
  fijos: Repeat,
  comida: UtensilsCrossed,
  super: ShoppingCart,
  transporte: Car,
  online: ShoppingBag,
  entretenimiento: Clapperboard,
  salud: HeartPulse,
  servicios: Plug,
  suscripciones: Tv,
  msi: CalendarClock,
  colegiaturas: GraduationCap,
  comisiones: Percent,
  efectivo: Banknote,
  viajes: Plane,
  hogar: Home,
  otros: CircleDot,
  nomina: Briefcase,
  ingreso: ArrowDownLeft,
  rendimiento: TrendingUp,
  pago_tarjeta: CreditCard,
  transferencia: ArrowLeftRight,
  inversion: PiggyBank,
};

export function iconoCategoria(id: string): LucideIcon {
  return ICONOS[id] ?? CircleDot;
}
