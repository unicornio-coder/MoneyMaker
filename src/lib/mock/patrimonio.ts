// Activos, pasivos y objetivos del prototipo para el usuario demo.

import type { Activo, Objetivo, Pasivo } from '@/lib/domain/tipos';

export const activosMock: Omit<Activo, 'id'>[] = [
  { tipo: 'casa', nombre: 'Departamento Del Valle', valor: 3_200_000, detalle: { m2: 84, anio: 2019 } },
  { tipo: 'auto', nombre: 'Tahoe 2022', valor: 890_000, detalle: { anio: 2022, km: 41_000, depreciacionAnual: 0.12 } },
  { tipo: 'auto', nombre: 'Suburban 2025', valor: 1_450_000, detalle: { anio: 2025, km: 8_000, depreciacionAnual: 0.15 } },
  { tipo: 'inversion', nombre: 'GBM+', valor: 164_053, detalle: {}, cuentaId: 'mock-gbm' },
  { tipo: 'cripto', nombre: 'Bitso', valor: 41_300, detalle: {}, cuentaId: 'mock-bitso' },
  { tipo: 'efectivo', nombre: 'BBVA Débito', valor: 18_420, detalle: {}, cuentaId: 'mock-bbva-4821' },
];

export const pasivosMock: Omit<Pasivo, 'id'>[] = [
  { tipo: 'hipoteca', nombre: 'Hipoteca BBVA', saldo: 1_850_000, tasa: 9.9 },
  { tipo: 'auto', nombre: 'Crédito Suburban', saldo: 620_000, tasa: 12.5 },
  { tipo: 'tarjeta', nombre: 'Nu Crédito', saldo: 6_480, tasa: 68, cuentaId: 'mock-nu-7710' },
  { tipo: 'tarjeta', nombre: 'Amex Personal', saldo: 10_000, tasa: 55, cuentaId: 'mock-amex-1004' },
  { tipo: 'tarjeta', nombre: 'Coppel', saldo: 4_500, tasa: 60, cuentaId: 'mock-coppel-2288' },
];

export const objetivosMock: Omit<Objetivo, 'id'>[] = [
  { grupo: 'ahorro', nombre: 'Fondo de emergencia', meta: 90_000, avance: 54_000, fecha: '2027-03-31', completado: false },
  { grupo: 'ahorro', nombre: 'Viaje a Japón', meta: 60_000, avance: 21_500, fecha: '2027-06-15', completado: false },
  { grupo: 'deuda', nombre: 'Liquidar Coppel', meta: 9_000, avance: 4_500, fecha: '2027-05-25', completado: false },
  { grupo: 'deuda', nombre: 'Pagar Nu en ceros', meta: 6_480, avance: 6_480, fecha: '2026-08-02', completado: true },
  { grupo: 'inversion', nombre: '$200,000 en GBM+', meta: 200_000, avance: 164_053, fecha: '2027-03-01', cuentaId: 'mock-gbm', completado: false },
];
