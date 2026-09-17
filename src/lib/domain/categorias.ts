// Catálogo de categorías (espejo de la tabla `categories`). Colores: nunca rojo.

import type { Categoria } from './tipos';

export const CATEGORIAS: Categoria[] = [
  { id: 'fijos', nombre: 'Fijos', color: '#0B1F17', tipo: 'gasto', orden: 1 },
  { id: 'comida', nombre: 'Comida', color: '#16A34A', tipo: 'gasto', orden: 2 },
  { id: 'super', nombre: 'Súper', color: '#16A34A', tipo: 'gasto', orden: 3 },
  { id: 'transporte', nombre: 'Transporte', color: '#2563EB', tipo: 'gasto', orden: 4 },
  { id: 'online', nombre: 'Compras en línea', color: '#6366F1', tipo: 'gasto', orden: 5 },
  { id: 'entretenimiento', nombre: 'Entretenimiento', color: '#6366F1', tipo: 'gasto', orden: 6 },
  { id: 'salud', nombre: 'Salud', color: '#16A34A', tipo: 'gasto', orden: 7 },
  { id: 'servicios', nombre: 'Servicios', color: '#0B1F17', tipo: 'gasto', orden: 8 },
  { id: 'suscripciones', nombre: 'Suscripciones', color: '#0B1F17', tipo: 'gasto', orden: 9 },
  { id: 'msi', nombre: 'Meses sin intereses', color: '#6366F1', tipo: 'gasto', orden: 10 },
  { id: 'colegiaturas', nombre: 'Colegiaturas', color: '#0B1F17', tipo: 'gasto', orden: 11 },
  { id: 'comisiones', nombre: 'Comisiones e intereses', color: '#2563EB', tipo: 'gasto', orden: 12 },
  { id: 'efectivo', nombre: 'Retiro de efectivo', color: '#2563EB', tipo: 'gasto', orden: 13 },
  { id: 'viajes', nombre: 'Viajes', color: '#2563EB', tipo: 'gasto', orden: 14 },
  { id: 'hogar', nombre: 'Hogar', color: '#0B1F17', tipo: 'gasto', orden: 15 },
  { id: 'otros', nombre: 'Otros', color: '#7A8C84', tipo: 'gasto', orden: 99 },
  { id: 'nomina', nombre: 'Nómina', color: '#16A34A', tipo: 'ingreso', orden: 1 },
  { id: 'ingreso', nombre: 'Ingreso', color: '#16A34A', tipo: 'ingreso', orden: 2 },
  { id: 'rendimiento', nombre: 'Rendimiento', color: '#16A34A', tipo: 'ingreso', orden: 3 },
  { id: 'pago_tarjeta', nombre: 'Pago de tarjeta', color: '#7A8C84', tipo: 'transferencia', orden: 1 },
  { id: 'transferencia', nombre: 'Transferencia', color: '#7A8C84', tipo: 'transferencia', orden: 2 },
  { id: 'inversion', nombre: 'Aportación a inversión', color: '#6366F1', tipo: 'transferencia', orden: 3 },
];

const POR_ID = new Map(CATEGORIAS.map((c) => [c.id, c]));

export function categoria(id: string): Categoria {
  return POR_ID.get(id) ?? POR_ID.get('otros')!;
}

export const CATEGORIAS_GASTO = CATEGORIAS.filter((c) => c.tipo === 'gasto');

/** Etiqueta del tipo de movimiento para el historial. */
export function etiquetaTipo(tipo: 'gasto' | 'ingreso' | 'pago_tarjeta' | 'transferencia', esMsi?: boolean): string {
  if (esMsi) return 'A meses';
  return { gasto: 'Compra', ingreso: 'Ingreso', pago_tarjeta: 'Pago', transferencia: 'Transferencia' }[tipo];
}
