import { describe, expect, it } from 'vitest';
import { ahorroAnual, importacionesDelMes, incluye, nivelPlan, puedeConectarBanco, puedeImportarPdf } from './plan';

const ahora = new Date('2026-09-28T12:00:00Z');

describe('nivelPlan', () => {
  it('con los planes apagados todos son plus, sin importar el perfil', () => {
    expect(nivelPlan({ plan: 'gratis', trialTermina: '2020-01-01' }, ahora, false)).toBe('plus');
    expect(nivelPlan({ plan: 'trial', trialTermina: '2020-01-01' }, ahora, false)).toBe('plus');
  });
  it('plus si paga', () => {
    expect(nivelPlan({ plan: 'plus', trialTermina: '2026-01-01', planRenueva: '2026-10-28' }, ahora, true)).toBe('plus');
  });
  it('plus durante la prueba y gratis cuando termina', () => {
    expect(nivelPlan({ plan: 'trial', trialTermina: '2026-10-02T00:00:00Z' }, ahora, true)).toBe('plus');
    expect(nivelPlan({ plan: 'trial', trialTermina: '2026-09-20T00:00:00Z' }, ahora, true)).toBe('gratis');
  });
  it('la prueba de Stripe manda sobre la del registro', () => {
    expect(nivelPlan({ plan: 'trial', trialTermina: '2026-09-20T00:00:00Z', planRenueva: '2026-10-05T00:00:00Z' }, ahora, true)).toBe('plus');
  });
  it('gratis explícito', () => {
    expect(nivelPlan({ plan: 'gratis', trialTermina: '2027-01-01' }, ahora, true)).toBe('gratis');
  });
});

describe('límites', () => {
  it('gratis: un banco y un PDF al mes; plus sin límite', () => {
    expect(puedeConectarBanco('gratis', 0)).toBe(true);
    expect(puedeConectarBanco('gratis', 1)).toBe(false);
    expect(puedeConectarBanco('plus', 9)).toBe(true);
    expect(puedeImportarPdf('gratis', 0)).toBe(true);
    expect(puedeImportarPdf('gratis', 1)).toBe(false);
    expect(puedeImportarPdf('plus', 30)).toBe(true);
  });
  it('funciones de plus', () => {
    expect(incluye('gratis', 'cancelacion')).toBe(false);
    expect(incluye('gratis', 'exportar')).toBe(false);
    expect(incluye('plus', 'negociacion')).toBe(true);
  });
  it('cuenta solo las importaciones válidas del mes', () => {
    const imps = [
      { createdAt: '2026-09-03T10:00:00Z', estado: 'confirmada' },
      { createdAt: '2026-09-15T10:00:00Z', estado: 'error' },
      { createdAt: '2026-08-30T10:00:00Z', estado: 'confirmada' },
    ];
    expect(importacionesDelMes(imps, '2026-09-28')).toBe(1);
  });
  it('el anual ahorra frente a 12 meses', () => {
    expect(ahorroAnual()).toBe(498);
  });
});
