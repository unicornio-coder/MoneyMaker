import { describe, expect, it } from 'vitest';
import { armarResumenIA, claveResumenIA } from './resumenIA';
import { quincenaDe } from './quincena';
import type { Movimiento, Recurrente } from './tipos';

const HOY = new Date(2026, 8, 25);
const mov = (fecha: string, monto: number, categoriaId: string, raw: string): Movimiento => ({ id: fecha + monto, cuentaId: 'c', fecha, descripcionRaw: raw, comercio: raw.split(' ')[0], monto, tipo: 'gasto', categoriaId, categoriaFuente: 'regla', esMsi: false, fuente: 'manual', hash: fecha + monto });
const rec: Recurrente = { id: 'n', nombre: 'Netflix', tipo: 'suscripcion', monto: 249, diaCobro: 28, frecuencia: 'mensual', veces: 4, activo: true, origen: 'detectado', ultimoCargo: '2026-08-28' };

describe('resumen para la IA', () => {
  const rango = quincenaDe(HOY, [15, 30]);
  const movs = [mov('2026-09-16', 1200, 'comida', 'RAPPI *SUSHI 4521 CDMX'), mov('2026-09-20', 800, 'transporte', 'UBER *TRIP HELP.UBER.COM'), mov('2026-09-02', 500, 'comida', 'OXXO SUC 4521')];
  const r = armarResumenIA({ movs, recurrentes: [rec], rango, diasPago: [15, 30], ingresoPeriodo: 14500, excedente: 3000, hoy: HOY, diasRestantes: 5, presupuesto: [{ categoriaId: 'comida', limite: 1500, actual: 1200 }] });

  it('solo lleva cifras y nombres de categorías o suscripciones, nunca descripciones del banco', () => {
    const texto = JSON.stringify(r);
    expect(texto).not.toContain('RAPPI');
    expect(texto).not.toContain('UBER');
    expect(texto).not.toContain('4521');
    expect(r.gasto).toBe(2000);
    expect(r.gastoAnterior).toBe(500);
    expect(r.categorias[0]).toEqual({ nombre: 'Comida', monto: 1200, anterior: 500 });
    expect(r.suscripciones).toEqual([{ nombre: 'Netflix', mensual: 249, meses: 4 }]);
    expect(r.presupuesto).toEqual([{ nombre: 'Comida', limite: 1500, actual: 1200 }]);
    expect(r.proximosCobros[0]?.nombre).toBe('Netflix');
    expect(r.ingreso).toBe(14500);
  });

  it('la clave cambia solo cuando cambian el periodo o los datos de forma relevante', () => {
    const a = claveResumenIA(r, rango.inicio);
    const b = claveResumenIA({ ...r, gasto: r.gasto + 100 }, rango.inicio);
    const c = claveResumenIA({ ...r, gasto: r.gasto + 900 }, rango.inicio);
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});
