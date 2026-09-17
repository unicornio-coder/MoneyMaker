import { describe, expect, it } from 'vitest';
import { costoMensual, detectarRecurrentes, proximoCobro } from './recurrentes';
import type { Movimiento } from './tipos';

let n = 0;
function mov(p: Partial<Movimiento> & { fecha: string; comercio: string; monto: number }): Movimiento {
  n++;
  return {
    id: `m${n}`,
    cuentaId: 'c1',
    descripcionRaw: p.comercio,
    comercioDominio: null,
    tipo: 'gasto',
    categoriaId: 'otros',
    categoriaFuente: 'regla',
    esMsi: false,
    fuente: 'import',
    hash: `h${n}`,
    ...p,
  };
}

const HOY = new Date(2026, 8, 16);

describe('detectarRecurrentes', () => {
  it('suscripción mensual con 3 cargos', () => {
    const movs = [
      mov({ fecha: '2026-07-12', comercio: 'Netflix', monto: 219, categoriaId: 'suscripciones' }),
      mov({ fecha: '2026-08-12', comercio: 'Netflix', monto: 219, categoriaId: 'suscripciones' }),
      mov({ fecha: '2026-09-12', comercio: 'Netflix', monto: 219, categoriaId: 'suscripciones' }),
    ];
    const r = detectarRecurrentes(movs, HOY);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ nombre: 'Netflix', tipo: 'suscripcion', frecuencia: 'mensual', monto: 219, veces: 3, diaCobro: 12, activo: true });
  });

  it('servicio con monto variable dentro de tolerancia (CFE)', () => {
    const movs = [
      mov({ fecha: '2026-07-03', comercio: 'CFE', monto: 610, categoriaId: 'servicios' }),
      mov({ fecha: '2026-08-03', comercio: 'CFE', monto: 655, categoriaId: 'servicios' }),
      mov({ fecha: '2026-09-03', comercio: 'CFE', monto: 640, categoriaId: 'servicios' }),
    ];
    expect(detectarRecurrentes(movs, HOY)[0]).toMatchObject({ nombre: 'CFE', tipo: 'servicio', frecuencia: 'mensual' });
  });

  it('comercio desconocido necesita cadencia y montos iguales', () => {
    const irregular = [
      mov({ fecha: '2026-07-01', comercio: 'Oxxo', monto: 50, categoriaId: 'super' }),
      mov({ fecha: '2026-07-04', comercio: 'Oxxo', monto: 120, categoriaId: 'super' }),
      mov({ fecha: '2026-08-20', comercio: 'Oxxo', monto: 80, categoriaId: 'super' }),
    ];
    expect(detectarRecurrentes(irregular, HOY)).toHaveLength(0);
    const regular = [
      mov({ fecha: '2026-07-15', comercio: 'Renta depto', monto: 9000 }),
      mov({ fecha: '2026-08-15', comercio: 'Renta depto', monto: 9000 }),
    ];
    expect(detectarRecurrentes(regular, HOY)[0]).toMatchObject({ nombre: 'Renta depto', tipo: 'otro', frecuencia: 'mensual', monto: 9000 });
  });

  it('suscripción conocida con un solo cargo se propone como nueva', () => {
    const movs = [mov({ fecha: '2026-09-10', comercio: 'Spotify', monto: 129, categoriaId: 'suscripciones' })];
    expect(detectarRecurrentes(movs, HOY)[0]).toMatchObject({ nombre: 'Spotify', tipo: 'suscripcion', veces: 1 });
  });

  it('MSI: cuotas, restantes y fecha de término', () => {
    const movs = [
      mov({ fecha: '2026-08-07', comercio: 'Amazon', monto: 650, categoriaId: 'msi', esMsi: true, msiCuota: 1, msiTotal: 6 }),
      mov({ fecha: '2026-09-07', comercio: 'Amazon', monto: 650, categoriaId: 'msi', esMsi: true, msiCuota: 2, msiTotal: 6 }),
    ];
    const r = detectarRecurrentes(movs, HOY);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ tipo: 'msi', msiCuotasTotal: 6, msiCuotasPagadas: 2, msiTermina: '2027-01-07', activo: true, veces: 2 });
  });

  it('MSI terminado queda inactivo', () => {
    const movs = [mov({ fecha: '2026-09-01', comercio: 'Coppel', monto: 500, categoriaId: 'msi', esMsi: true, msiCuota: 18, msiTotal: 18 })];
    expect(detectarRecurrentes(movs, HOY)[0].activo).toBe(false);
  });

  it('inactivo si dejó de cobrar hace mucho', () => {
    const movs = [
      mov({ fecha: '2026-03-12', comercio: 'HBO Max', monto: 149, categoriaId: 'suscripciones' }),
      mov({ fecha: '2026-04-12', comercio: 'HBO Max', monto: 149, categoriaId: 'suscripciones' }),
    ];
    expect(detectarRecurrentes(movs, HOY)[0].activo).toBe(false);
  });

  it('costo mensual y próximo cobro', () => {
    expect(costoMensual({ monto: 1200, frecuencia: 'anual' })).toBe(100);
    expect(costoMensual({ monto: 100, frecuencia: 'quincenal' })).toBe(200);
    expect(proximoCobro({ diaCobro: 12, frecuencia: 'mensual', ultimoCargo: '2026-09-12' }, HOY).getMonth()).toBe(9);
    expect(proximoCobro({ diaCobro: 20, frecuencia: 'mensual', ultimoCargo: '2026-08-20' }, HOY).getDate()).toBe(20);
  });
});
