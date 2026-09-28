import { beforeEach, describe, expect, it } from 'vitest';
import { limitar, reiniciarLimites } from './ratelimit';

describe('limitar', () => {
  beforeEach(() => reiniciarLimites());

  it('deja pasar hasta el máximo y luego frena con el tiempo de espera', () => {
    const l = { max: 3, ventanaMs: 60_000 };
    expect(limitar('a', l, 0)).toEqual({ ok: true, restantes: 2 });
    expect(limitar('a', l, 1000)).toEqual({ ok: true, restantes: 1 });
    expect(limitar('a', l, 2000)).toEqual({ ok: true, restantes: 0 });
    expect(limitar('a', l, 3000)).toEqual({ ok: false, reintentarEnS: 57 });
  });

  it('cada llave lleva su cuenta y la ventana se reinicia', () => {
    const l = { max: 1, ventanaMs: 10_000 };
    expect(limitar('a', l, 0).ok).toBe(true);
    expect(limitar('b', l, 0).ok).toBe(true);
    expect(limitar('a', l, 5000).ok).toBe(false);
    expect(limitar('a', l, 10_000).ok).toBe(true);
  });
});
