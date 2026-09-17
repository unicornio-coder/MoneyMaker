// Interfaz de agregación bancaria. Belvo es la implementación real; mock para desarrollo sin llaves.
// Las pantallas nunca llaman a esto: lo usa el pipeline de ingesta (services/ingest.ts).

import type { MovimientoCrudo, TipoCuenta } from '@/lib/domain/tipos';
import { belvo } from './belvo';
import { mockAggregator } from './aggregator.mock';

export type Institucion = {
  id: string;
  nombre: string;
  dominio: string;
  tipo: 'banco' | 'fintech' | 'inversion';
  /** Cubierta por el agregador (true) o requiere estado de cuenta / manual (false). */
  automatica: boolean;
};

export type CuentaExterna = {
  externalId: string;
  nombre: string;
  banco: string;
  bancoDominio: string;
  tipo: TipoCuenta;
  ultimos4?: string | null;
  saldo: number;
  limite?: number | null;
  pagoMinimo?: number | null;
  fechaCorte?: string | null;
  fechaLimite?: string | null;
};

export type ResultadoSync = {
  cuentas: CuentaExterna[];
  /** Movimientos por externalId de cuenta. */
  movimientos: Record<string, MovimientoCrudo[]>;
};

export interface Aggregator {
  readonly nombre: 'belvo' | 'mock';
  listarInstituciones(): Promise<Institucion[]>;
  /** Token de un solo uso para abrir el widget en el cliente. */
  tokenWidget(userId: string, opciones?: { linkId?: string }): Promise<{ access: string; refresh?: string }>;
  /** Descarga cuentas y movimientos de un link ya creado por el widget. */
  sincronizar(linkExternalId: string, desde: string): Promise<ResultadoSync>;
  /** Borra el link en el proveedor (derecho al olvido). */
  eliminarLink(linkExternalId: string): Promise<void>;
}

export function getAggregator(): Aggregator {
  if (process.env.BELVO_SECRET_ID && process.env.BELVO_SECRET_PASSWORD) return belvo;
  return mockAggregator;
}
