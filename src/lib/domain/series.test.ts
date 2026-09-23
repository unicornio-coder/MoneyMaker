import { describe, expect, it } from 'vitest';
import { ultimoRangoConDatos } from './series';
import type { Movimiento } from './tipos';

const mov = (fecha: string, tipo: Movimiento['tipo'] = 'gasto'): Movimiento =>
  ({ id: fecha, cuentaId: 'c', fecha, descripcionRaw: 'x', comercio: 'x', comercioDominio: null, categoriaId: 'otros', categoriaFuente: 'regla', monto: 100, tipo, esMsi: false, msiCuota: null, msiTotal: null, recurrenteId: null, fuente: 'manual', hash: fecha, createdAt: '' }) as unknown as Movimiento;

describe('ultimoRangoConDatos', () => {
  const hoy = new Date(2026, 8, 21); // 21 sep 2026
  it('si el periodo actual tiene movimientos, es el actual', () => {
    const r = ultimoRangoConDatos([mov('2026-09-10')], 'mes', hoy);
    expect(r).toMatchObject({ actual: true, rango: { inicio: '2026-09-01' } });
  });
  it('si los estados de cuenta terminan en agosto, muestra agosto y avisa que no es el actual', () => {
    const r = ultimoRangoConDatos([mov('2026-08-28'), mov('2026-07-02')], 'mes', hoy);
    expect(r).toMatchObject({ actual: false, rango: { inicio: '2026-08-01', fin: '2026-08-31' } });
    const q = ultimoRangoConDatos([mov('2026-08-28')], 'q', hoy, [5, 20]);
    expect(q).toMatchObject({ actual: false, rango: { inicio: '2026-08-20', fin: '2026-09-04' } });
  });
  it('sin movimientos, el actual', () => {
    expect(ultimoRangoConDatos([], 'mes', hoy).actual).toBe(true);
  });
  it('las transferencias no cuentan como datos', () => {
    expect(ultimoRangoConDatos([mov('2026-09-10', 'transferencia'), mov('2026-08-10')], 'mes', hoy)).toMatchObject({ actual: false, rango: { inicio: '2026-08-01' } });
  });
});
