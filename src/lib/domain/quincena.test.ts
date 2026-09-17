import { describe, expect, it } from 'vitest';
import { desplazar, diasRestantes, mesDe, proximoDiaDePago, quincenaDe, rangoDe, ultimosPeriodos, vecesPorPeriodo } from './quincena';

describe('quincena', () => {
  it('Q1 sep = 5–19 sep con días 5 y 20', () => {
    const q = quincenaDe(new Date(2026, 8, 16));
    expect(q.inicio).toBe('2026-09-05');
    expect(q.fin).toBe('2026-09-19');
    expect(q.corta).toBe('Q1 sep');
  });

  it('Q2 sep cruza al mes siguiente (20 sep – 4 oct)', () => {
    const q = quincenaDe(new Date(2026, 9, 2));
    expect(q.inicio).toBe('2026-09-20');
    expect(q.fin).toBe('2026-10-04');
    expect(q.corta).toBe('Q2 sep');
  });

  it('el día de pago pertenece a la quincena que empieza', () => {
    expect(quincenaDe(new Date(2026, 8, 20)).corta).toBe('Q2 sep');
    expect(quincenaDe(new Date(2026, 8, 5)).corta).toBe('Q1 sep');
    expect(quincenaDe(new Date(2026, 8, 4)).corta).toBe('Q2 ago');
  });

  it('días de pago 15 y 30 en febrero se ajustan al último día', () => {
    const q = quincenaDe(new Date(2026, 1, 20), [15, 30]);
    expect(q.inicio).toBe('2026-02-15');
    expect(q.fin).toBe('2026-02-27');
    expect(q.corta).toBe('Q1 feb');
    const q2 = quincenaDe(new Date(2026, 1, 28), [15, 30]);
    expect(q2.inicio).toBe('2026-02-28');
    expect(q2.fin).toBe('2026-03-14');
  });

  it('un solo día de pago = periodo mensual desde ese día', () => {
    const q = quincenaDe(new Date(2026, 8, 16), [1]);
    expect(q.inicio).toBe('2026-09-01');
    expect(q.fin).toBe('2026-09-30');
    expect(q.corta).toBe('sep');
  });

  it('desplazar ±1 recorre quincenas contiguas', () => {
    const q = quincenaDe(new Date(2026, 8, 16));
    expect(desplazar(q, -1).corta).toBe('Q2 ago');
    expect(desplazar(q, 1).corta).toBe('Q2 sep');
    expect(desplazar(q, -2).inicio).toBe('2026-08-05');
  });

  it('ultimosPeriodos devuelve 6 quincenas en orden', () => {
    const qs = ultimosPeriodos('q', 6, new Date(2026, 8, 16));
    expect(qs.map((q) => q.corta)).toEqual(['Q1 jul', 'Q2 jul', 'Q1 ago', 'Q2 ago', 'Q1 sep', 'Q1 sep'].slice(0, 0).concat(['Q2 jun', 'Q1 jul', 'Q2 jul', 'Q1 ago', 'Q2 ago', 'Q1 sep']));
  });

  it('mes y año', () => {
    expect(mesDe(new Date(2026, 1, 10))).toMatchObject({ inicio: '2026-02-01', fin: '2026-02-28', corta: 'feb' });
    expect(rangoDe('anio', new Date(2026, 5, 1))).toMatchObject({ inicio: '2026-01-01', fin: '2026-12-31' });
  });

  it('días restantes y próximo pago', () => {
    const q = quincenaDe(new Date(2026, 8, 16));
    expect(diasRestantes(q, new Date(2026, 8, 16))).toBe(4);
    expect(diasRestantes(q, new Date(2026, 8, 19))).toBe(1);
    expect(diasRestantes(q, new Date(2026, 8, 25))).toBe(0);
    expect(proximoDiaDePago(new Date(2026, 8, 16)).getDate()).toBe(20);
    expect(proximoDiaDePago(new Date(2026, 8, 20)).getDate()).toBe(20);
    expect(proximoDiaDePago(new Date(2026, 8, 21)).getDate()).toBe(5);
  });

  it('prorrateo de fijos por periodo', () => {
    expect(vecesPorPeriodo('mensual', 'q')).toBe(0.5);
    expect(vecesPorPeriodo('mensual', 'mes')).toBe(1);
    expect(vecesPorPeriodo('anual', 'mes')).toBeCloseTo(1 / 12);
    expect(vecesPorPeriodo('quincenal', 'q')).toBe(1);
  });
});
