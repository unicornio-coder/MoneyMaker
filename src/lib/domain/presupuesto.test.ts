import { describe, expect, it } from 'vitest';
import { excedenteInvertible, presupuestoVsActual, proponerPresupuesto } from './presupuesto';
import { quincenaDe } from './quincena';
import type { Movimiento, Recurrente } from './tipos';

let n = 0;
const mov = (fecha: string, categoriaId: string, monto: number, extra: Partial<Movimiento> = {}): Movimiento => ({
  id: `m${++n}`, cuentaId: 'c1', fecha, descripcionRaw: '', comercio: categoriaId, monto, tipo: 'gasto', categoriaId, categoriaFuente: 'regla', esMsi: false, fuente: 'import', hash: `h${n}`, ...extra,
});
const rec = (tipo: Recurrente['tipo'], monto: number, extra: Partial<Recurrente> = {}): Recurrente => ({
  id: `r${++n}`, nombre: tipo, tipo, monto, frecuencia: 'mensual', veces: 3, activo: true, origen: 'detectado', ...extra,
});

const HOY = new Date(2026, 8, 16); // Q1 sep = 5–19 sep

describe('proponerPresupuesto', () => {
  it('prorratea fijos a quincena y promedia variables de 3 quincenas anteriores', () => {
    const recurrentes = [rec('servicio', 640), rec('suscripcion', 219), rec('suscripcion', 129), rec('msi', 650, { msiCuotasTotal: 6, msiCuotasPagadas: 2 })];
    const movs = [
      // Q2 ago (20 ago–4 sep), Q1 ago (5–19 ago), Q2 jul (20 jul–4 ago)
      mov('2026-08-25', 'comida', 900), mov('2026-08-10', 'comida', 1100), mov('2026-07-25', 'comida', 1000),
      mov('2026-08-22', 'transporte', 400), mov('2026-08-12', 'transporte', 600),
      mov('2026-09-10', 'comida', 5000), // periodo actual: no cuenta para el promedio
    ];
    const lineas = proponerPresupuesto(movs, recurrentes, 'q', HOY);
    const por = Object.fromEntries(lineas.map((l) => [l.categoriaId, l.limite]));
    expect(por.fijos).toBe(300); // 640/2 = 320 → redondeo a 50 → 300
    expect(por.suscripciones).toBe(150); // (219+129)/2 = 174 → 150
    expect(por.msi).toBe(350); // 650/2 = 325 → redondeo a 50 → 350
    expect(por.comida).toBe(1000);
    expect(por.transporte).toBe(500);
    expect(lineas[0].categoriaId).toBe('fijos');
  });

  it('sin datos no propone variables', () => {
    expect(proponerPresupuesto([], [], 'mes', HOY)).toEqual([]);
  });
});

describe('presupuestoVsActual', () => {
  it('calcula gastado, libres, por día y excedido', () => {
    const rango = quincenaDe(HOY);
    const lineas = [
      { id: 'l1', categoriaId: 'comida', limite: 1000, orden: 1 },
      { id: 'l2', categoriaId: 'transporte', limite: 500, orden: 2 },
    ];
    const movs = [mov('2026-09-08', 'comida', 1238), mov('2026-09-09', 'transporte', 142), mov('2026-09-01', 'comida', 999)];
    const r = presupuestoVsActual(lineas, movs, rango, 14500, HOY);
    expect(r.gastado).toBe(1380);
    expect(r.limiteTotal).toBe(1500);
    expect(r.libres).toBe(120);
    expect(r.diasRestantes).toBe(4);
    expect(r.porDia).toBe(30);
    expect(r.lineas[0]).toMatchObject({ categoriaId: 'comida', actual: 1238, diferencia: -238, excedido: true });
    expect(r.lineas[1]).toMatchObject({ actual: 142, excedido: false });
    expect(Math.round(r.pctGastado)).toBe(92);
  });

  it('excedente invertible', () => {
    expect(excedenteInvertible(14500, [{ categoriaId: 'fijos', limite: 5000, orden: 1 }, { categoriaId: 'comida', limite: 3000, orden: 2 }])).toBe(6500);
    expect(excedenteInvertible(1000, [{ categoriaId: 'fijos', limite: 5000, orden: 1 }])).toBe(0);
  });
});
