import { describe, expect, it } from 'vitest';
import { aCentavos, aPesos, formatearCentavos, parsearMontoCentavos, sumarCentavos } from './money';

describe('money', () => {
  it('centavos ↔ pesos sin deriva de flotantes', () => {
    expect(aCentavos(0.1 + 0.2)).toBe(30);
    expect(aCentavos(1238)).toBe(123800);
    expect(aPesos(123800)).toBe(1238);
    expect(aPesos(45)).toBe(0.45);
    expect(sumarCentavos([10, 20, 0.4])).toBe(30);
  });

  it('parsea montos como vienen en los estados de cuenta', () => {
    expect(parsearMontoCentavos('$1,238.00')).toBe(123800);
    expect(parsearMontoCentavos('(450.00)')).toBe(-45000);
    expect(parsearMontoCentavos('-1,200')).toBe(-120000);
    expect(parsearMontoCentavos('1.234,56')).toBe(123456);
    expect(parsearMontoCentavos(19.99)).toBe(1999);
    expect(parsearMontoCentavos('')).toBeNull();
    expect(parsearMontoCentavos('abc')).toBeNull();
  });

  it('formatea en es-MX sin decimales', () => {
    expect(formatearCentavos(1245000)).toBe('$12,450');
    expect(formatearCentavos(-120000)).toBe('-$1,200');
    expect(formatearCentavos(49)).toBe('$0');
  });
});
