// Datos demo tomados del prototipo (TJ, movimientos, posiciones). Determinísticos: sirven para el usuario demo,
// el agregador mock y las pruebas visuales. Los movimientos se generan para los últimos 4 meses relativos a hoy.

import type { MovimientoCrudo } from '@/lib/domain/tipos';
import type { CuentaExterna } from '@/lib/services/aggregator';
import { aISO, sumarDias, sumarMeses, ultimoDiaDelMes } from '@/lib/domain/fechas';

export type CuentaMock = CuentaExterna & { bancoClave: string };

const HOY = new Date();
const corte = (dia: number) => {
  const d = new Date(HOY.getFullYear(), HOY.getMonth(), Math.min(dia, ultimoDiaDelMes(HOY)));
  return aISO(d < HOY ? sumarMeses(d, 1) : d);
};

export const cuentasMock: CuentaMock[] = [
  { bancoClave: 'nu', externalId: 'mock-nu-7710', nombre: 'Nu Crédito', banco: 'Nu', bancoDominio: 'nu.com.mx', tipo: 'credito', ultimos4: '7710', saldo: 6480, limite: 20000, pagoMinimo: 520, fechaCorte: corte(12), fechaLimite: corte(2) },
  { bancoClave: 'amex', externalId: 'mock-amex-1004', nombre: 'Amex Personal', banco: 'Amex', bancoDominio: 'americanexpress.com', tipo: 'credito', ultimos4: '1004', saldo: 10000, limite: 45000, pagoMinimo: 900, fechaCorte: corte(20), fechaLimite: corte(10) },
  { bancoClave: 'coppel', externalId: 'mock-coppel-2288', nombre: 'Coppel', banco: 'Coppel', bancoDominio: 'coppel.com', tipo: 'credito', ultimos4: '2288', saldo: 4500, limite: 12000, pagoMinimo: 500, fechaCorte: corte(25), fechaLimite: corte(15) },
  { bancoClave: 'bbva', externalId: 'mock-bbva-4821', nombre: 'BBVA Débito', banco: 'BBVA', bancoDominio: 'bbva.mx', tipo: 'debito', ultimos4: '4821', saldo: 18420 },
  { bancoClave: 'bitso', externalId: 'mock-bitso', nombre: 'Bitso', banco: 'Bitso', bancoDominio: 'bitso.com', tipo: 'inversion', saldo: 41300 },
  { bancoClave: 'gbm', externalId: 'mock-gbm', nombre: 'GBM+', banco: 'GBM+', bancoDominio: 'gbm.com', tipo: 'inversion', saldo: 164053 },
];

/** Posiciones de inversión (para el drawer "En qué estás invertido"). */
export const posicionesMock: Record<string, { ticker: string; nombre: string; dominio: string; cantidad: number; valor: number; variacion: number }[]> = {
  'mock-bitso': [
    { ticker: 'BTC', nombre: 'Bitcoin', dominio: 'bitcoin.org', cantidad: 0.012, valor: 24800, variacion: 12.3 },
    { ticker: 'ETH', nombre: 'Ethereum', dominio: 'ethereum.org', cantidad: 0.18, valor: 11200, variacion: 6.1 },
    { ticker: 'SOL', nombre: 'Solana', dominio: 'solana.com', cantidad: 14, valor: 3900, variacion: -2.4 },
    { ticker: 'USDT', nombre: 'Tether', dominio: 'tether.to', cantidad: 70, valor: 1400, variacion: 0 },
  ],
  'mock-gbm': [
    { ticker: 'CETES', nombre: 'Cetes 28 días', dominio: 'cetesdirecto.com', cantidad: 1, valor: 120000, variacion: 10.4 },
    { ticker: 'GBMDEUDA', nombre: 'Fondo GBM Deuda', dominio: 'gbm.com', cantidad: 1, valor: 44053, variacion: 8.9 },
  ],
};

/** Serie de valor (11 puntos) para la línea "Cómo va tu inversión". */
export const seriesMock: Record<string, number[]> = {
  'mock-bitso': [30.2, 31.8, 29.4, 33.1, 35.6, 34.2, 37.9, 39.1, 38.4, 40.2, 41.3].map((x) => x * 1000),
  'mock-gbm': [140, 143, 147, 149, 152, 155, 157, 159, 161, 163, 164.053].map((x) => x * 1000),
};

type Plantilla = { dia: number; descripcion: string; monto: number; esAbono?: boolean; /** cada N meses (1 = mensual) */ cada?: number; /** MSI: cuotas totales y cuota en el mes más reciente */ msi?: [number, number]; variacion?: number };

// Cargos mensuales por cuenta (día del mes, descripción como la muestra el banco, monto).
const PLANTILLAS: Record<string, Plantilla[]> = {
  'mock-nu-7710': [
    { dia: 12, descripcion: 'NETFLIX.COM', monto: 219 },
    { dia: 3, descripcion: 'SPOTIFY', monto: 129 },
    { dia: 7, descripcion: 'AMAZON MX MSI', monto: 650, msi: [6, 2] },
    { dia: 9, descripcion: 'RAPPI RESTAURANTES', monto: 318, variacion: 0.5 },
    { dia: 9, descripcion: 'UBER *TRIP', monto: 142, variacion: 0.6 },
    { dia: 16, descripcion: 'UBER *TRIP', monto: 98, variacion: 0.6 },
    { dia: 8, descripcion: 'SORIANA HIPER', monto: 1238, variacion: 0.3 },
    { dia: 22, descripcion: 'SORIANA HIPER', monto: 980, variacion: 0.3 },
    { dia: 5, descripcion: 'CINEPOLIS PLAZA', monto: 240, variacion: 0.4 },
    { dia: 14, descripcion: 'OXXO SUC 4521', monto: 188, variacion: 0.7 },
    { dia: 27, descripcion: 'OXXO SUC 4521', monto: 96, variacion: 0.7 },
    { dia: 19, descripcion: 'SHEIN MX', monto: 560, variacion: 0.8 },
    { dia: 2, descripcion: 'SU PAGO GRACIAS', monto: 6480, esAbono: true, variacion: 0.2 },
    { dia: 13, descripcion: 'INTERESES DEL PERIODO', monto: 264, variacion: 0.3 },
  ],
  'mock-amex-1004': [
    { dia: 6, descripcion: 'LIVERPOOL MSI', monto: 1150, msi: [12, 5] },
    { dia: 5, descripcion: 'GASOLINA BP', monto: 450, variacion: 0.3 },
    { dia: 19, descripcion: 'GASOLINA BP', monto: 480, variacion: 0.3 },
    { dia: 8, descripcion: 'STARBUCKS', monto: 98, variacion: 0.4 },
    { dia: 24, descripcion: 'STARBUCKS', monto: 112, variacion: 0.4 },
    { dia: 11, descripcion: 'HBO MAX', monto: 149 },
    { dia: 15, descripcion: 'AEROMEXICO', monto: 3200, cada: 3, variacion: 0.5 },
    { dia: 1, descripcion: 'COMISION ANUALIDAD TARJETA', monto: 430, cada: 12 },
    { dia: 10, descripcion: 'PAGO RECIBIDO', monto: 5200, esAbono: true, variacion: 0.3 },
    { dia: 21, descripcion: 'VIPS INSURGENTES', monto: 420, variacion: 0.4 },
  ],
  'mock-coppel-2288': [{ dia: 25, descripcion: 'REFRIGERADOR PARCIALIDAD', monto: 500, msi: [18, 9] }],
  'mock-bbva-4821': [
    { dia: 5, descripcion: 'PAGO DE NOMINA EMPRESA SA DE CV', monto: 14500, esAbono: true },
    { dia: 20, descripcion: 'PAGO DE NOMINA EMPRESA SA DE CV', monto: 14500, esAbono: true },
    { dia: 3, descripcion: 'CFE SSB', monto: 640, variacion: 0.15 },
    { dia: 4, descripcion: 'TOTALPLAY', monto: 899 },
    { dia: 6, descripcion: 'TELCEL RECARGA PLAN', monto: 399 },
    { dia: 2, descripcion: 'PAGO TARJETA NU 7710', monto: 6480, variacion: 0.2 },
    { dia: 10, descripcion: 'PAGO TARJETA AMEX 1004', monto: 5200, variacion: 0.3 },
    { dia: 15, descripcion: 'SPEI ENVIADO GBM APORTACION', monto: 3000 },
    { dia: 1, descripcion: 'SPEI ENVIADO BITSO', monto: 2000, variacion: 0.3 },
    { dia: 9, descripcion: 'OXXO', monto: 188, variacion: 0.6 },
    { dia: 17, descripcion: 'RETIRO CAJERO ATM', monto: 1500 },
    { dia: 23, descripcion: 'WALMART SUPERCENTER', monto: 1420, variacion: 0.3 },
    { dia: 11, descripcion: 'FARMACIAS DEL AHORRO', monto: 260, variacion: 0.5 },
    { dia: 28, descripcion: 'SMART FIT', monto: 499 },
  ],
  'mock-bitso': [
    { dia: 6, descripcion: 'COMPRA BTC', monto: 2000, variacion: 0.3 },
    { dia: 1, descripcion: 'COMPRA ETH', monto: 1500, variacion: 0.3 },
  ],
  'mock-gbm': [
    { dia: 7, descripcion: 'RENDIMIENTO CETES', monto: 1040, esAbono: true, variacion: 0.1 },
    { dia: 15, descripcion: 'APORTACION', monto: 3000 },
  ],
};

/** PRNG determinístico para variar montos sin aleatoriedad real. */
function ruido(semilla: string, k: number): number {
  let h = 2166136261;
  const s = `${semilla}#${k}`;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return (h % 1000) / 1000 - 0.5; // −0.5 … 0.5
}

/** Movimientos crudos de una cuenta demo para los últimos `meses` meses hasta hoy. */
export function movimientosCrudosMock(externalId: string, meses = 4, hoy = HOY): MovimientoCrudo[] {
  const plantillas = PLANTILLAS[externalId] ?? [];
  const out: MovimientoCrudo[] = [];
  for (let k = meses - 1; k >= 0; k--) {
    const mes = sumarMeses(new Date(hoy.getFullYear(), hoy.getMonth(), 1), -k);
    for (const p of plantillas) {
      const indiceMes = mes.getFullYear() * 12 + mes.getMonth();
      if (p.cada && indiceMes % p.cada !== 0) continue;
      const fecha = new Date(mes.getFullYear(), mes.getMonth(), Math.min(p.dia, ultimoDiaDelMes(mes)));
      if (fecha > hoy) continue;
      let descripcion = p.descripcion;
      if (p.msi) {
        const [total, cuotaHoy] = p.msi;
        const cuota = cuotaHoy - k;
        if (cuota < 1 || cuota > total) continue;
        descripcion = `${p.descripcion} ${String(cuota).padStart(2, '0')}/${String(total).padStart(2, '0')}`;
      }
      const factor = p.variacion ? 1 + ruido(externalId + p.descripcion, k) * p.variacion : 1;
      out.push({ fecha: aISO(fecha), descripcion, monto: Math.round(p.monto * factor), esAbono: !!p.esAbono, externalId: `${externalId}:${p.descripcion}:${aISO(fecha)}` });
    }
  }
  // Un par de movimientos de "hoy" y "ayer" para que el historial tenga grupos.
  if (externalId === 'mock-nu-7710') {
    out.push({ fecha: aISO(hoy), descripcion: 'RAPPI RESTAURANTES', monto: 318, esAbono: false, externalId: `${externalId}:hoy-1` });
    out.push({ fecha: aISO(hoy), descripcion: 'UBER *TRIP', monto: 142, esAbono: false, externalId: `${externalId}:hoy-2` });
    out.push({ fecha: aISO(sumarDias(hoy, -1)), descripcion: 'OXXO SUC 4521', monto: 76, esAbono: false, externalId: `${externalId}:ayer-1` });
  }
  return out.sort((a, b) => b.fecha.localeCompare(a.fecha));
}
