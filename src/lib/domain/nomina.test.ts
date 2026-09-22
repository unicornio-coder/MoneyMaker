import { describe, expect, it } from 'vitest';
import { detectarDiasPago, detectarNomina, estimarIngresoQuincenal, remitenteDe } from './nomina';
import type { Movimiento } from './tipos';

let n = 0;
function mov(p: Partial<Movimiento> & { fecha: string; monto: number }): Movimiento {
  n++;
  return { id: `m${n}`, cuentaId: 'c1', descripcionRaw: 'SPEI RECIBIDO EMPRESA SA DE CV 0012345', comercio: 'Empresa', comercioDominio: null, tipo: 'ingreso', categoriaId: 'ingreso', categoriaFuente: 'regla', esMsi: false, fuente: 'import', hash: `h${n}`, ...p };
}

describe('remitenteDe', () => {
  it('quita referencias numéricas y ruido bancario', () => {
    expect(remitenteDe('SPEI RECIBIDO EMPRESA SA DE CV 0012345')).toBe('EMPRESA SA CV');
    expect(remitenteDe('SPEI RECIBIDO EMPRESA SA DE CV 0099999')).toBe('EMPRESA SA CV');
  });
});

describe('detectarNomina', () => {
  it('mismo remitente, quincenal y montos parecidos → nómina', () => {
    const movs = [mov({ fecha: '2026-07-15', monto: 14500 }), mov({ fecha: '2026-07-31', monto: 14500 }), mov({ fecha: '2026-08-14', monto: 14620 }), mov({ fecha: '2026-08-31', monto: 14500 })];
    expect(detectarNomina(movs)).toHaveLength(4);
  });

  it('depósitos irregulares (freelancer) no son nómina', () => {
    const movs = [mov({ fecha: '2026-07-03', monto: 8000 }), mov({ fecha: '2026-07-21', monto: 23000 }), mov({ fecha: '2026-08-28', monto: 4100 })];
    expect(detectarNomina(movs)).toHaveLength(0);
  });

  it('respeta la corrección del usuario y no reetiqueta lo que ya es nómina', () => {
    const movs = [mov({ fecha: '2026-07-15', monto: 14500, categoriaId: 'nomina' }), mov({ fecha: '2026-07-31', monto: 14500 }), mov({ fecha: '2026-08-15', monto: 14500, categoriaFuente: 'usuario', categoriaId: 'ingreso' })];
    expect(detectarNomina(movs)).toEqual([movs[1].id]);
  });
});

describe('detectarDiasPago', () => {
  const nomina = (fecha: string, monto = 14500) => mov({ fecha, monto, categoriaId: 'nomina' });

  it('nómina los 15 y 30 (con fin de mes variable)', () => {
    const movs = [nomina('2026-06-15'), nomina('2026-06-30'), nomina('2026-07-15'), nomina('2026-07-31'), nomina('2026-08-14'), nomina('2026-08-31')];
    expect(detectarDiasPago(movs)).toEqual({ dias: [15, 30], depositos: 6 });
  });

  it('nómina mensual → un solo día', () => {
    const movs = [nomina('2026-07-01'), nomina('2026-08-01'), nomina('2026-09-01')];
    expect(detectarDiasPago(movs)?.dias).toEqual([1]);
  });

  it('febrero: el 30 cae en 28 y sigue siendo fin de mes', () => {
    const movs = [nomina('2026-02-13'), nomina('2026-02-28'), nomina('2026-03-13'), nomina('2026-03-30')];
    expect(detectarDiasPago(movs)?.dias).toEqual([13, 30]);
  });

  it('con un solo depósito no propone nada', () => {
    expect(detectarDiasPago([nomina('2026-08-15')])).toBeNull();
    expect(detectarDiasPago([])).toBeNull();
  });
});

describe('estimarIngresoQuincenal', () => {
  const hoy = new Date(2026, 8, 21);
  it('quincenal: la mediana de los depósitos', () => {
    const movs = [mov({ fecha: '2026-07-15', monto: 14500, categoriaId: 'nomina' }), mov({ fecha: '2026-07-31', monto: 14500, categoriaId: 'nomina' }), mov({ fecha: '2026-08-15', monto: 14700, categoriaId: 'nomina' }), mov({ fecha: '2026-08-31', monto: 14500, categoriaId: 'nomina' })];
    expect(estimarIngresoQuincenal(movs, hoy)).toBe(14500);
  });
  it('mensual: la mitad del depósito', () => {
    const movs = [mov({ fecha: '2026-07-01', monto: 30000, categoriaId: 'nomina' }), mov({ fecha: '2026-08-01', monto: 30000, categoriaId: 'nomina' })];
    expect(estimarIngresoQuincenal(movs, hoy)).toBe(15000);
  });
  it('sin nómina → 0; nómina vieja (> 6 meses) no cuenta', () => {
    expect(estimarIngresoQuincenal([], hoy)).toBe(0);
    expect(estimarIngresoQuincenal([mov({ fecha: '2025-12-15', monto: 14500, categoriaId: 'nomina' })], hoy)).toBe(0);
  });
});
