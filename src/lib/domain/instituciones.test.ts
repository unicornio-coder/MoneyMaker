import { describe, expect, it } from 'vitest';
import { diagnosticarInstituciones, esBanco } from './instituciones';

describe('diagnóstico de instituciones de Belvo', () => {
  it('cuenta por tipo y detecta que no hay bancos (solo SAT e IMSS)', () => {
    const d = diagnosticarInstituciones([
      { name: 'tatooine_mx_fiscal', display_name: 'Tatooine Fiscal', type: 'fiscal' },
      { name: 'imss_mx_employment', display_name: 'IMSS', type: 'employment' },
    ], 'sandbox');
    expect(d.hayBancos).toBe(false);
    expect(d.bancos).toEqual([]);
    expect(d.porTipo).toEqual({ fiscal: 1, employment: 1 });
    expect(d.mensaje).toContain('ningún banco');
    expect(d.mensaje).toContain('no se resuelve desde el código');
  });

  it('con bancos, los lista por nombre visible y explica el entorno', () => {
    const d = diagnosticarInstituciones([
      { name: 'erebor_mx_retail', display_name: 'Erebor Mexico', type: 'bank' },
      { name: 'nu_mx_retail', display_name: null, type: 'fintech' },
      { name: 'tatooine_mx_fiscal', display_name: 'Tatooine Fiscal', type: 'fiscal' },
    ], 'sandbox');
    expect(d.hayBancos).toBe(true);
    expect(d.bancos).toEqual(['Erebor Mexico', 'nu_mx_retail']);
    expect(d.mensaje).toContain('2 bancos de prueba');
    expect(diagnosticarInstituciones([{ name: 'bbva_mx_retail', display_name: 'BBVA', type: 'BANK' }], 'production').mensaje).toContain('1 bancos y fintech');
  });

  it('sin instituciones apunta a las llaves', () => {
    expect(diagnosticarInstituciones([], 'production').mensaje).toContain('llaves');
    expect(esBanco({ type: 'employment' })).toBe(false);
  });
});
