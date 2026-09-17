import { describe, expect, it } from 'vitest';
import { filasAMovimientos, movimientosPorRegex, parsearFecha, parsearMonto } from './importer';

describe('parsearFecha', () => {
  it('formatos comunes de bancos mexicanos', () => {
    expect(parsearFecha('12/09/2026')).toBe('2026-09-12');
    expect(parsearFecha('12-09-26')).toBe('2026-09-12');
    expect(parsearFecha('2026-09-12')).toBe('2026-09-12');
    expect(parsearFecha('12 sep 2026')).toBe('2026-09-12');
    expect(parsearFecha('12/sep', 2026)).toBe('2026-09-12');
    expect(parsearFecha('05 de septiembre de 2026')).toBe('2026-09-05');
    expect(parsearFecha(46277)).toBe('2026-09-12');
    expect(parsearFecha('hola')).toBeNull();
  });
});

describe('parsearMonto', () => {
  it('signos, paréntesis y separadores', () => {
    expect(parsearMonto('$1,238.00')).toBe(1238);
    expect(parsearMonto('(450.00)')).toBe(-450);
    expect(parsearMonto('-1,200')).toBe(-1200);
    expect(parsearMonto('1.234,56')).toBe(1234.56);
    expect(parsearMonto('')).toBeNull();
  });
});

describe('filasAMovimientos', () => {
  it('columnas cargo/abono (BBVA)', () => {
    const filas = [
      { Fecha: '08/09/2026', Descripción: 'SORIANA HIPER', Cargo: '1,238.00', Abono: '', Saldo: '17,182.00' },
      { Fecha: '05/09/2026', Descripción: 'PAGO DE NOMINA', Cargo: '', Abono: '14,500.00', Saldo: '18,420.00' },
    ];
    const m = filasAMovimientos(filas, []);
    expect(m).toEqual([
      { fecha: '2026-09-08', descripcion: 'SORIANA HIPER', monto: 1238, esAbono: false },
      { fecha: '2026-09-05', descripcion: 'PAGO DE NOMINA', monto: 14500, esAbono: true },
    ]);
  });

  it('una sola columna de monto con signo (Nu)', () => {
    const filas = [
      { Fecha: '2026-09-09', Concepto: 'Rappi', Monto: '-318.00' },
      { Fecha: '2026-09-01', Concepto: 'Pago recibido', Monto: '6480.00' },
    ];
    const m = filasAMovimientos(filas, []);
    expect(m[0]).toMatchObject({ monto: 318, esAbono: false });
    expect(m[1]).toMatchObject({ monto: 6480, esAbono: true });
  });

  it('encuentra los encabezados aunque haya título arriba', () => {
    const filas = [
      { A: 'Estado de cuenta BBVA', B: '', C: '' },
      { A: '', B: '', C: '' },
      { A: 'Fecha', B: 'Concepto', C: 'Importe' },
      { A: '10/09/2026', B: 'OXXO', C: '-188.00' },
    ];
    const m = filasAMovimientos(filas, []);
    expect(m).toEqual([{ fecha: '2026-09-10', descripcion: 'OXXO', monto: 188, esAbono: false }]);
  });

  it('avisa si no reconoce columnas', () => {
    const adv: string[] = [];
    expect(filasAMovimientos([{ x: 1, y: 2 }], adv)).toEqual([]);
    expect(adv.length).toBe(1);
  });
});

describe('movimientosPorRegex', () => {
  it('lee líneas de un PDF convertido a texto', () => {
    const texto = `
      09/sep  RAPPI RESTAURANTES CDMX          $318.00
      07 sep  AMAZON MX MSI 02/06               650.00
      01/09/2026  SU PAGO GRACIAS              6,480.00
      Saldo anterior 2,640.00
    `;
    const m = movimientosPorRegex(texto);
    expect(m).toHaveLength(3);
    expect(m[0]).toMatchObject({ descripcion: 'RAPPI RESTAURANTES CDMX', monto: 318, esAbono: false });
    expect(m[2]).toMatchObject({ monto: 6480, esAbono: true });
  });
});
