import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as XLSX from 'xlsx';
import type { Extraccion } from './esquema';

const llm = vi.hoisted(() => ({ hayLLM: vi.fn((): boolean => false), extraerEstadoDeCuenta: vi.fn() }));
vi.mock('../llm', () => llm);

import { fuenteTabla, hojasATexto } from './statement-table';

const EXTRACCION: Extraccion = {
  esEstadoDeCuenta: true,
  institucion: 'Nu',
  producto: null,
  tipoCuenta: 'credito',
  ultimos4: '4321',
  periodoInicio: '2026-09-01',
  periodoFin: '2026-09-30',
  fechaCorte: '2026-09-30',
  fechaLimitePago: null,
  pagoMinimo: null,
  pagoParaNoGenerarIntereses: null,
  saldoAlCorte: 1500,
  limiteCredito: null,
  totalCargos: 1500,
  totalAbonos: 0,
  tarjetasAdicionales: [],
  movimientos: [
    { fecha: '2026-09-03', descripcion: 'NETFLIX.COM', monto: 219, esAbono: false, monedaOriginal: null, montoOriginal: null, esPosibleSuscripcion: true, razonSuscripcion: 'streaming', msiCuota: null, msiTotal: null, tarjetaUltimos4: null },
    { fecha: '2026-09-10', descripcion: 'OXXO', monto: 1281, esAbono: false, monedaOriginal: null, montoOriginal: null, esPosibleSuscripcion: false, razonSuscripcion: null, msiCuota: null, msiTotal: null, tarjetaUltimos4: null },
  ],
};

/** Excel que las reglas no entienden: título arriba y columnas con nombres que no están en la heurística. */
function excelRaro(): Buffer {
  const ws = XLSX.utils.aoa_to_sheet([
    ['Nu México · Resumen de tu tarjeta ···· 4321'],
    [],
    ['Cuándo', 'Qué', 'Cuánto'],
    ['03/09/2026', 'NETFLIX.COM', 219],
    ['10/09/2026', 'OXXO', 1281],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Movimientos');
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as ArrayBuffer);
}

describe('fuente de tabla (CSV y Excel)', () => {
  beforeEach(() => {
    llm.hayLLM.mockReturnValue(false);
    llm.extraerEstadoDeCuenta.mockReset();
  });

  it('un CSV con columnas claras se lee con reglas, sin modelo', async () => {
    const csv = 'Fecha,Concepto,Cargo,Abono\n03/09/2026,NETFLIX.COM,219.00,\n05/09/2026,SU PAGO,,900.00\n';
    const etapas: string[] = [];
    const r = await fuenteTabla.extraer({ nombre: 'bbva.csv', datos: Buffer.from(csv), onEtapa: (e) => etapas.push(e) });
    expect(r.metodo).toBe('tabla');
    expect(r.movimientos).toHaveLength(2);
    expect(r.movimientos[1]).toMatchObject({ esAbono: true, montoCentavos: 90000 });
    expect(etapas).toEqual(['leyendo', 'cuadrando']);
    expect(llm.extraerEstadoDeCuenta).not.toHaveBeenCalled();
  });

  it('un Excel que las reglas no entienden, sin modelo, dice que falta la lectura inteligente (no que no es estado de cuenta)', async () => {
    await expect(fuenteTabla.extraer({ nombre: 'nu.xlsx', datos: excelRaro() })).rejects.toMatchObject({ codigo: 'sin_modelo' });
    expect(llm.extraerEstadoDeCuenta).not.toHaveBeenCalled();
  });

  it('con modelo, las hojas se convierten a texto y las lee el modelo antes de rechazar', async () => {
    llm.hayLLM.mockReturnValue(true);
    llm.extraerEstadoDeCuenta.mockResolvedValue({ extraccion: EXTRACCION, tokens: { entrada: 10, salida: 5 } });
    const etapas: string[] = [];
    const r = await fuenteTabla.extraer({ nombre: 'nu.xlsx', datos: excelRaro(), onEtapa: (e) => etapas.push(e) });
    expect(r.metodo).toBe('claude-texto');
    expect(r.movimientos).toHaveLength(2);
    expect(r.resumen).toMatchObject({ institucion: 'Nu', ultimos4: '4321', esEstadoDeCuenta: true });
    expect(etapas).toEqual(['leyendo', 'extrayendo', 'cuadrando']);
    const texto = (llm.extraerEstadoDeCuenta.mock.calls[0][0] as { texto: string }).texto;
    expect(texto).toContain('Hoja: Movimientos');
    expect(texto).toContain('NETFLIX.COM');
    expect(texto).toContain('Archivo: nu.xlsx');
    expect(r.advertencias).not.toContain('No reconocimos las columnas de fecha, concepto y monto.');
  });

  it('si el modelo dice que no es un estado de cuenta, se rechaza con ese motivo', async () => {
    llm.hayLLM.mockReturnValue(true);
    llm.extraerEstadoDeCuenta.mockResolvedValue({ extraccion: { ...EXTRACCION, esEstadoDeCuenta: false, movimientos: [] }, tokens: { entrada: 1, salida: 1 } });
    await expect(fuenteTabla.extraer({ nombre: 'presupuesto.xlsx', datos: excelRaro() })).rejects.toMatchObject({ codigo: 'no_es_estado' });
  });

  it('hojasATexto incluye el nombre de cada hoja', () => {
    const wb = XLSX.read(excelRaro(), { type: 'buffer' });
    expect(hojasATexto(wb)).toMatch(/^--- Hoja: Movimientos ---\n/);
  });
});

describe('pareceTenerMovimientos', () => {
  it('rechaza texto sin fechas; acepta dos fechas o una fecha con monto', async () => {
    const { pareceTenerMovimientos } = await import('./statement-table');
    expect(pareceTenerMovimientos('a,b\n1,2\n')).toBe(false);
    expect(pareceTenerMovimientos('Lista del súper: leche, pan, huevos')).toBe(false);
    expect(pareceTenerMovimientos('03/09/2026 NETFLIX 219\n10/09/2026 OXXO 1281')).toBe(true);
    expect(pareceTenerMovimientos('Corte 15/09/2026 saldo $1,845.00')).toBe(true);
  });
});
