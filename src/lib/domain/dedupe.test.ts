import { describe, expect, it } from 'vitest';
import { evaluarCuadre, indexarRepetidos } from './dedupe';
import { hashMovimiento } from './categorizar';
import type { MovimientoNormalizado } from './tipos';

const mov = (p: Partial<MovimientoNormalizado>): MovimientoNormalizado => ({ fecha: '2026-09-10', descripcion: 'OXXO', montoCentavos: 5000, esAbono: false, moneda: 'MXN', esPosibleSuscripcion: false, ...p });

describe('indexarRepetidos', () => {
  it('dos cargos idénticos en el mismo archivo se conservan con hashes distintos', () => {
    const lista = indexarRepetidos([mov({}), mov({}), mov({ montoCentavos: 6000 })]);
    expect(lista.map((m) => m.repeticion)).toEqual([0, 1, 0]);
    const h0 = hashMovimiento('c1', '2026-09-10', 'OXXO', 50, false, 0);
    const h1 = hashMovimiento('c1', '2026-09-10', 'OXXO', 50, false, 1);
    expect(h0).not.toBe(h1);
    expect(hashMovimiento('c1', '2026-09-10', 'OXXO', 50, false)).toBe(h0);
  });

  it('el mismo cargo en dos periodos traslapados recibe el mismo índice (se deduplica)', () => {
    const a = indexarRepetidos([mov({ fecha: '2026-08-30' })]);
    const b = indexarRepetidos([mov({ fecha: '2026-08-30' }), mov({ fecha: '2026-09-02', descripcion: 'RAPPI' })]);
    expect(a[0].repeticion).toBe(b[0].repeticion);
  });

  it('acepta movimientos crudos en pesos', () => {
    const lista = indexarRepetidos([{ fecha: '2026-09-10', descripcion: 'Oxxo suc 1', monto: 50, esAbono: false }, { fecha: '2026-09-10', descripcion: 'OXXO SUC 1', monto: 50.0, esAbono: false }]);
    expect(lista[1].repeticion).toBe(1);
  });
});

describe('evaluarCuadre', () => {
  const movs = [mov({ montoCentavos: 100000 }), mov({ montoCentavos: 250000 }), mov({ montoCentavos: 300000, esAbono: true })];

  it('ok dentro de ±1 % o ±$50', () => {
    expect(evaluarCuadre(movs, { totalCargosCentavos: 350000, totalAbonosCentavos: 300000 }).cuadre).toBe('ok');
    expect(evaluarCuadre(movs, { totalCargosCentavos: 353000, totalAbonosCentavos: 300000 }).cuadre).toBe('ok');
    expect(evaluarCuadre(movs, { totalCargosCentavos: 354900, totalAbonosCentavos: 300000 }).cuadre).toBe('ok');
  });

  it('sin_cuadre cuando la diferencia supera la tolerancia', () => {
    const r = evaluarCuadre(movs, { totalCargosCentavos: 400000, totalAbonosCentavos: 300000 });
    expect(r.cuadre).toBe('sin_cuadre');
    expect(r.diferenciaCargosCentavos).toBe(-50000);
  });

  it('sin_resumen cuando el documento no trae totales', () => {
    expect(evaluarCuadre(movs, { totalCargosCentavos: null, totalAbonosCentavos: null }).cuadre).toBe('sin_resumen');
    expect(evaluarCuadre(movs, { totalCargosCentavos: 350000, totalAbonosCentavos: null }).cuadre).toBe('ok');
  });
});
