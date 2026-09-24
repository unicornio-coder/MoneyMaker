import { describe, expect, it } from 'vitest';
import { generarInsights } from './insights';
import { quincenaDe } from './quincena';
import type { Movimiento, Recurrente } from './tipos';

const mov = (id: string, comercio: string, monto: number, fecha: string, recurrenteId: string | null = null): Movimiento =>
  ({ id, cuentaId: 'c', fecha, descripcionRaw: comercio.toUpperCase(), comercio, comercioDominio: null, categoriaId: 'suscripciones', categoriaFuente: 'regla', monto, tipo: 'gasto', esMsi: false, msiCuota: null, msiTotal: null, recurrenteId, fuente: 'import', hash: id }) as Movimiento;
const rec = (id: string, nombre: string, canceladoAt: string | null): Recurrente =>
  ({ id, nombre, comercioDominio: null, tipo: 'suscripcion', monto: 249, diaCobro: 15, frecuencia: 'mensual', primerCargo: '2026-01-15', ultimoCargo: '2026-08-15', veces: 8, activo: !canceladoAt, canceladoAt, origen: 'detectado' }) as Recurrente;

describe('vigilancia después de cancelar', () => {
  const hoy = new Date(2026, 8, 21);
  const rango = quincenaDe(hoy);
  it('un cargo posterior a la fecha de cancelación genera "te siguió cobrando"', () => {
    const out = generarInsights({ movs: [mov('a', 'Netflix', 249, '2026-08-15', 'r1'), mov('b', 'Netflix', 249, '2026-09-15')], recurrentes: [rec('r1', 'Netflix', '2026-08-20T10:00:00.000Z')], rango, ingresoPeriodo: 0, excedente: 0, hoy });
    const i = out.find((x) => x.tipo === 'cargo_tras_cancelar');
    expect(i).toBeDefined();
    expect(i?.titulo).toBe('Netflix te siguió cobrando');
    expect(i?.referencia).toMatchObject({ recurrenteId: 'r1', movimientoIds: ['b'] });
  });
  it('sin cargos después de cancelar, nada', () => {
    const out = generarInsights({ movs: [mov('a', 'Netflix', 249, '2026-08-15', 'r1')], recurrentes: [rec('r1', 'Netflix', '2026-08-20T10:00:00.000Z')], rango, ingresoPeriodo: 0, excedente: 0, hoy });
    expect(out.some((x) => x.tipo === 'cargo_tras_cancelar')).toBe(false);
  });
});
