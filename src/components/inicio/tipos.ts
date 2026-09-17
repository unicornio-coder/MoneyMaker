import type { Cuenta, Movimiento, Objetivo, Recurrente } from '@/lib/domain/tipos';

export type Posicion = { ticker: string; nombre: string; dominio: string; cantidad: number; valor: number; variacion: number };

export type DetalleInversion = { serie: number[]; posiciones: Posicion[]; rendimiento: string; aportado: number };

export type CuentaVista = Cuenta & { externalId?: string | null; inversion?: DetalleInversion | null };

export type DatosInicio = {
  cuentas: CuentaVista[];
  movimientos: Movimiento[];
  recurrentes: Recurrente[];
  objetivos: Objetivo[];
  diasPago: number[];
  hoy: string;
  /** Instituciones disponibles para conectar. */
  instituciones: { id: string; nombre: string; dominio: string; tipo: 'banco' | 'fintech' | 'inversion'; automatica: boolean }[];
  agregador: 'belvo' | 'mock';
};
