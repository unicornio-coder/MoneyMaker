// Agregador simulado: sin llaves de Belvo la app puede "conectar" un banco y recibir datos realistas.

import type { Aggregator, Institucion, ResultadoSync } from './aggregator';
import { BANCOS } from '@/lib/domain/comercios';
import { cuentasMock, movimientosCrudosMock } from '@/lib/mock/cuentas';

/** Catálogo fijo de instituciones mexicanas: lo usa el simulado y sirve de respaldo cuando Belvo no responde. */
export const INSTITUCIONES_MX: Institucion[] = [
  ...['bbva', 'banorte', 'santander', 'hsbc', 'banamex', 'scotiabank', 'inbursa', 'azteca'].map((k) => ({ id: `${k}_mx_retail`, nombre: BANCOS[k].nombre, dominio: BANCOS[k].dominio, tipo: 'banco' as const, automatica: true })),
  ...['nu', 'amex', 'coppel', 'hey', 'klar', 'stori', 'mercadopago'].map((k) => ({ id: `${k}_mx_retail`, nombre: BANCOS[k].nombre, dominio: BANCOS[k].dominio, tipo: 'fintech' as const, automatica: true })),
  ...['gbm', 'bitso', 'cetesdirecto', 'kuspit'].map((k) => ({ id: k, nombre: BANCOS[k].nombre, dominio: BANCOS[k].dominio, tipo: 'inversion' as const, automatica: k === 'bitso' })),
];

export const mockAggregator: Aggregator = {
  nombre: 'mock',
  entorno: 'mock',
  async listarInstituciones() {
    return INSTITUCIONES_MX;
  },
  async tokenWidget() {
    return { access: 'mock-widget-token' };
  },
  async sincronizar(linkExternalId): Promise<ResultadoSync> {
    // linkExternalId = id de institución mock, p. ej. 'bbva_mx_retail' o 'nu_mx_retail'.
    const banco = linkExternalId.replace(/_mx.*$/, '');
    const cuentas = cuentasMock.filter((c) => c.bancoClave === banco);
    const movimientos: Record<string, ReturnType<typeof movimientosCrudosMock>> = {};
    for (const c of cuentas) movimientos[c.externalId] = movimientosCrudosMock(c.externalId);
    return { cuentas: cuentas.map(({ bancoClave: _b, ...c }) => c), movimientos };
  },
  async eliminarLink() {},
};
