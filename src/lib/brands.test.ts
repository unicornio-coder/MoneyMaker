import { describe, expect, it } from 'vitest';
import { colorDeMarca, fuentesLogo, inicialesDeMarca, logoLocal, normalizarDominio } from './brands';

describe('brands', () => {
  it('normaliza dominios', () => {
    expect(normalizarDominio(' https://www.Netflix.com/mx ')).toBe('netflix.com');
    expect(normalizarDominio(null)).toBe('');
  });
  it('la cadena de fuentes va de local a favicon y termina en iniciales (lista vacía)', () => {
    const f = fuentesLogo('netflix.com');
    expect(f.length).toBeGreaterThanOrEqual(3);
    expect(f.some((u) => u.includes('clearbit'))).toBe(true);
    expect(f[f.length - 1]).toContain('duckduckgo');
    expect(fuentesLogo('')).toEqual([]);
    expect(logoLocal('no-existe.mx')).toBeNull();
  });
  it('el monograma usa el color del banco o uno estable de la paleta', () => {
    expect(colorDeMarca('BBVA', 'bbva.mx')).toBe('#072146');
    expect(colorDeMarca('Nu')).toBe('#820AD1');
    const c = colorDeMarca('Taquería El Güero', 'elguero.mx');
    expect(['#0B1F17', '#16A34A', '#2563EB', '#6366F1']).toContain(c);
    expect(colorDeMarca('Taquería El Güero', 'elguero.mx')).toBe(c);
    expect(inicialesDeMarca('Farmacia San Pablo')).toBe('FS');
  });
});
