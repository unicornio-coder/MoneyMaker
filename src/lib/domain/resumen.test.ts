import { describe, expect, it } from 'vitest';
import { avisosDeCobros, resumenSemanal, textoAvisos } from './resumen';
import type { Movimiento, Recurrente } from './tipos';

const HOY = new Date(2026, 8, 27); // domingo 27 sep 2026

function mov(fecha: string, monto: number, categoriaId = 'comida', comercio = 'Oxxo', tipo: Movimiento['tipo'] = 'gasto'): Movimiento {
  return { id: `${fecha}-${monto}`, cuentaId: 'c1', fecha, descripcionRaw: comercio, comercio, monto, tipo, categoriaId, categoriaFuente: 'regla', esMsi: false, fuente: 'manual', hash: `${fecha}${monto}` };
}
function rec(nombre: string, monto: number, diaCobro: number, extra: Partial<Recurrente> = {}): Recurrente {
  return { id: nombre, nombre, tipo: 'suscripcion', monto, diaCobro, frecuencia: 'mensual', veces: 3, activo: true, origen: 'detectado', ultimoCargo: `2026-08-${String(diaCobro).padStart(2, '0')}`, ...extra };
}

describe('resumenSemanal', () => {
  it('suma la semana, compara con la anterior y saca top y mayor gasto', () => {
    const movs = [mov('2026-09-21', 300), mov('2026-09-25', 900, 'transporte', 'Uber'), mov('2026-09-27', 200), mov('2026-09-15', 1000), mov('2026-09-19', 400), mov('2026-09-26', 5000, 'ingreso', 'Nómina', 'ingreso')];
    const r = resumenSemanal(movs, [], HOY);
    expect(r.desde).toBe('2026-09-21');
    expect(r.hasta).toBe('2026-09-27');
    expect(r.gasto).toBe(1400);
    expect(r.gastoAnterior).toBe(1400);
    expect(r.variacion).toBe(0);
    expect(r.movimientos).toBe(3);
    expect(r.topCategorias[0]).toEqual({ categoriaId: 'transporte', monto: 900 });
    expect(r.mayorGasto).toEqual({ comercio: 'Uber', monto: 900, fecha: '2026-09-25' });
  });
  it('sin semana anterior no hay variación; próximos cobros de los 7 días siguientes', () => {
    const r = resumenSemanal([mov('2026-09-22', 100)], [rec('Netflix', 219, 30), rec('Spotify', 115, 15)], HOY);
    expect(r.variacion).toBeNull();
    expect(r.proximos.lista.map((c) => c.recurrente.nombre)).toEqual(['Netflix']);
    expect(r.proximos.total).toBe(219);
  });
  it('detecta suscripciones recién aparecidas', () => {
    const nueva = rec('Disney+', 159, 24, { veces: 1, primerCargo: '2026-09-24', ultimoCargo: '2026-09-24' });
    const vieja = rec('Netflix', 219, 12);
    expect(resumenSemanal([], [nueva, vieja], HOY).suscripcionesNuevas.map((r) => r.nombre)).toEqual(['Disney+']);
  });
});

describe('avisosDeCobros', () => {
  it('avisa solo mañana y en 3 días, y arma el texto', () => {
    const recs = [rec('Netflix', 219, 28), rec('Spotify', 115, 30), rec('Gym', 700, 29)];
    const avisos = avisosDeCobros(recs, HOY);
    expect(avisos.map((a) => [a.recurrente.nombre, a.en])).toEqual([
      ['Netflix', 'manana'],
      ['Spotify', 'tres_dias'],
    ]);
    expect(textoAvisos(avisos, (n) => `$${n}`)).toBe('Mañana: Netflix $219 · En 3 días: Spotify $115');
  });
  it('sin cobros cercanos no hay aviso', () => {
    expect(avisosDeCobros([rec('Netflix', 219, 12)], HOY)).toEqual([]);
  });
});
