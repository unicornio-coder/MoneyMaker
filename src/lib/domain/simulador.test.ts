import { describe, expect, it } from 'vitest';
import { valorFuturo } from './simulador';

describe('simulador de inversión', () => {
  it('sin cambio de precio, terminas con lo que pusiste', () => {
    expect(valorFuturo(500, 3, 0)).toBe(500 * 72);
  });
  it('si el precio sube, terminas con más; si baja, con menos', () => {
    const puesto = 1000 * 24;
    expect(valorFuturo(1000, 1, 0.3)).toBeGreaterThan(puesto);
    expect(valorFuturo(1000, 1, -0.3)).toBeLessThan(puesto);
  });
  it('una sola aportación al final del periodo no gana nada todavía', () => {
    // 24 aportaciones en un año al 30 %: la suma queda entre lo aportado y lo aportado + 30 %.
    const fin = valorFuturo(1000, 1, 0.3);
    expect(fin).toBeLessThan(24_000 * 1.3);
  });
});
