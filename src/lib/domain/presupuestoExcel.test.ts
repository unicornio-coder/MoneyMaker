import { describe, expect, it } from 'vitest';
import { categoriaParaConcepto, lineasDesdeFilas } from './presupuestoExcel';

describe('presupuesto desde Excel', () => {
  it('manda cada concepto a una categoría nuestra', () => {
    expect(categoriaParaConcepto('Renta')).toBe('hogar');
    expect(categoriaParaConcepto('Súper y despensa')).toBe('super');
    expect(categoriaParaConcepto('Gasolina')).toBe('transporte');
    expect(categoriaParaConcepto('Netflix + Spotify')).toBe('suscripciones');
    expect(categoriaParaConcepto('Luz CFE')).toBe('servicios');
    expect(categoriaParaConcepto('Colegiatura niños')).toBe('colegiaturas');
    expect(categoriaParaConcepto('Cosas varias')).toBe('otros');
  });

  it('lee filas con encabezado, montos en texto y totales, y suma por categoría', () => {
    const filas = [
      ['Concepto', 'Monto'],
      ['Renta', '$8,500'],
      ['Luz', 450],
      ['Agua', 200],
      ['Súper', 3200.5],
      ['Restaurantes', '1,200'],
      ['Ahorro', ''],
      [null, null],
      ['Total', 13550],
    ];
    const r = lineasDesdeFilas(filas);
    expect(r.lineas.map((l) => [l.categoriaId, l.limite])).toEqual([
      ['hogar', 8500],
      ['super', 3201],
      ['comida', 1200],
      ['servicios', 650],
    ]);
    expect(r.lineas.find((l) => l.categoriaId === 'servicios')?.nombre).toBe('Servicios');
    expect(r.lineas.find((l) => l.categoriaId === 'hogar')?.nombre).toBe('Renta');
    expect(r.sinMonto).toEqual(['Ahorro']);
    expect(r.ignoradas).toBe(3);
  });

  it('toma el primer número a la derecha del concepto aunque haya columnas vacías', () => {
    const r = lineasDesdeFilas([['Gasolina', null, '', 1500, 1600]]);
    expect(r.lineas).toEqual([{ categoriaId: 'transporte', nombre: 'Gasolina', limite: 1500, origen: 'Gasolina' }]);
  });
});
