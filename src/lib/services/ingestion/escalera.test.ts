import { describe, expect, it } from 'vitest';
import type { MovimientoNormalizado, ResumenEstado } from '@/lib/domain/tipos';
import { leerEscalonado, reglasVerificadas, type Lectura } from './escalera';

const mov = (montoCentavos: number, esAbono = false): MovimientoNormalizado => ({ fecha: '2026-08-02', descripcion: 'MOVIMIENTO', montoCentavos, esAbono, moneda: 'MXN', esPosibleSuscripcion: false });

function lectura(cargos: number[], totalCargos: number | null, tokens = { entrada: 0, salida: 0 }): Lectura {
  const resumen = { esEstadoDeCuenta: true, totalCargosCentavos: totalCargos, totalAbonosCentavos: null } as unknown as ResumenEstado;
  return { resumen, movimientos: cargos.map((c) => mov(c)), tokens };
}

// Tres lecturas del mismo estado de cuenta, cuyo banco imprime "Total de cargos: $3,000.00".
const CUADRA = lectura([100_000, 200_000], 300_000);
const NO_CUADRA = lectura([100_000], 300_000);
const SIN_TOTALES = lectura([100_000, 200_000], null);

function contador() {
  const llamadas = { economico: 0, fuerte: 0 };
  return llamadas;
}

describe('lectura escalonada: de lo más barato a lo más caro', () => {
  it('si las reglas cuadran con los totales del banco, no se paga ningún modelo', async () => {
    const llamadas = contador();
    const r = await leerEscalonado({
      reglas: () => CUADRA,
      economico: async () => { llamadas.economico++; return CUADRA; },
      fuerte: async () => { llamadas.fuerte++; return CUADRA; },
    });
    expect(r.peldano).toBe('reglas');
    expect(r.intentos).toEqual(['reglas']);
    expect(llamadas).toEqual({ economico: 0, fuerte: 0 });
    expect(r.lectura.tokens).toEqual({ entrada: 0, salida: 0 });
  });

  it('las reglas no valen si no cuadran, si no hay totales contra qué comprobar o si no sacaron movimientos', () => {
    expect(reglasVerificadas(CUADRA)).toBe(true);
    expect(reglasVerificadas(NO_CUADRA)).toBe(false);
    expect(reglasVerificadas(SIN_TOTALES)).toBe(false);
    expect(reglasVerificadas(lectura([], 300_000))).toBe(false);
    expect(reglasVerificadas(null)).toBe(false);
  });

  it('si las reglas no se pueden comprobar, lee el modelo económico y ahí se queda cuando cuadra', async () => {
    const llamadas = contador();
    const r = await leerEscalonado({
      reglas: () => NO_CUADRA,
      economico: async () => { llamadas.economico++; return lectura([100_000, 200_000], 300_000, { entrada: 1000, salida: 500 }); },
      fuerte: async () => { llamadas.fuerte++; return CUADRA; },
    });
    expect(r.peldano).toBe('economico');
    expect(llamadas).toEqual({ economico: 1, fuerte: 0 });
    expect(r.lectura.tokens).toEqual({ entrada: 1000, salida: 500 });
  });

  it('sin totales en el documento no hay con qué dudar del modelo económico: no se sube al fuerte', async () => {
    const llamadas = contador();
    const r = await leerEscalonado({ economico: async () => { llamadas.economico++; return SIN_TOTALES; }, fuerte: async () => { llamadas.fuerte++; return CUADRA; } });
    expect(r.peldano).toBe('economico');
    expect(r.intentos).toEqual(['economico']);
    expect(llamadas.fuerte).toBe(0);
  });

  it('solo cuando el económico no cuadra se paga el modelo fuerte, y los tokens de los dos se suman', async () => {
    const r = await leerEscalonado({
      reglas: () => NO_CUADRA,
      economico: async () => lectura([100_000], 300_000, { entrada: 1000, salida: 500 }),
      fuerte: async () => lectura([100_000, 200_000], 300_000, { entrada: 1200, salida: 700 }),
    });
    expect(r.peldano).toBe('fuerte');
    expect(r.intentos).toEqual(['reglas', 'economico', 'fuerte']);
    expect(r.lectura.movimientos).toHaveLength(2);
    expect(r.lectura.tokens).toEqual({ entrada: 2200, salida: 1200 });
  });

  it('si el fuerte falla pero el económico leyó algo, se entrega esa lectura en vez de un error', async () => {
    const r = await leerEscalonado({ economico: async () => NO_CUADRA, fuerte: async () => { throw new Error('servicio caído'); } });
    expect(r.peldano).toBe('economico');
    expect(r.lectura).toBe(NO_CUADRA);
  });

  it('un fallo del económico solo sube al fuerte cuando el error lo amerita', async () => {
    const fallo = new Error('respuesta inválida');
    const sube = await leerEscalonado({ economico: async () => { throw fallo; }, fuerte: async () => CUADRA, reintentable: () => true });
    expect(sube.peldano).toBe('fuerte');

    const llamadas = contador();
    await expect(leerEscalonado({ economico: async () => { throw fallo; }, fuerte: async () => { llamadas.fuerte++; return CUADRA; }, reintentable: () => false })).rejects.toBe(fallo);
    await expect(leerEscalonado({ economico: async () => { throw fallo; }, fuerte: async () => { llamadas.fuerte++; return CUADRA; } })).rejects.toBe(fallo);
    expect(llamadas.fuerte).toBe(0);
  });
});
