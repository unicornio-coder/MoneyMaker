import { describe, expect, it } from 'vitest';
import { fechaCorta, fechaRelativa, formatFecha, formatMXN, money, pluralize, saludo } from './format';

describe('formatMXN', () => {
  it('es-MX sin decimales y negativos con signo delante', () => {
    expect(formatMXN(12450)).toBe('$12,450');
    expect(formatMXN(-1200)).toBe('-$1,200');
    expect(formatMXN(0)).toBe('$0');
    expect(formatMXN(1234567.6)).toBe('$1,234,568');
    expect(money).toBe(formatMXN);
  });
});

describe('formatFecha (fechas civiles, sin corrimiento por zona horaria)', () => {
  it('una fecha yyyy-mm-dd se muestra con el mismo día en cualquier zona', () => {
    expect(formatFecha('2026-09-01')).toBe('1 sep');
    expect(fechaCorta('2026-09-01')).toBe('1 sep');
    expect(formatFecha('2026-01-31', 'media')).toBe('31 ene 2026');
    expect(formatFecha('2026-12-25', 'larga')).toBe('25 de diciembre de 2026');
    expect(formatFecha('2026-08-15', 'mes')).toBe('Agosto 2026');
  });
  it('acepta ISO con hora tomando el día civil, Date y basura', () => {
    expect(formatFecha('2026-09-01T23:30:00.000Z')).toBe('1 sep');
    expect(formatFecha(new Date(2026, 8, 9))).toBe('9 sep');
    expect(formatFecha('nada')).toBe('');
  });
  it('fechaRelativa: hoy, ayer y fecha corta', () => {
    const hoy = new Date(2026, 8, 21);
    expect(fechaRelativa('2026-09-21', hoy)).toBe('Hoy');
    expect(fechaRelativa('2026-09-20', hoy)).toBe('Ayer');
    expect(fechaRelativa('2026-09-01', hoy)).toBe('1 sep');
  });
});

describe('pluralize', () => {
  it('singular, plural regular e irregular', () => {
    expect(pluralize(1, 'cuenta')).toBe('1 cuenta');
    expect(pluralize(3, 'cuenta')).toBe('3 cuentas');
    expect(pluralize(0, 'movimiento')).toBe('0 movimientos');
    expect(pluralize(2, 'mes', 'meses')).toBe('2 meses');
    expect(pluralize(2, 'mes')).toBe('2 meses');
    expect(pluralize(1250, 'movimiento')).toBe('1,250 movimientos');
  });
});

describe('saludo', () => {
  it('según la hora local', () => {
    expect(saludo('JC', 8)).toBe('Buenos días, JC');
    expect(saludo('JC', 14)).toBe('Buenas tardes, JC');
    expect(saludo('JC', 21)).toBe('Buenas noches, JC');
    expect(saludo(null, 9)).toBe('Buenos días');
    expect(saludo('  ', 9)).toBe('Buenos días');
  });
});
