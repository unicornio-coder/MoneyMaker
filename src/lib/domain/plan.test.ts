import { describe, expect, it } from 'vitest';
import { ahorroAnual, archivosEnUltimas24h, importacionesDelMes, incluye, nivelPlan, puedeConectarBanco, puedeImportarPdf, superaTopeDiario, TOPE_DIARIO_ARCHIVOS } from './plan';

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

describe('tope diario de archivos (protección contra abuso, no límite de plan)', () => {
  const AHORA = new Date('2026-11-19T18:00:00Z');
  const hace = (horas: number) => ({ createdAt: new Date(AHORA.getTime() - horas * 3_600_000).toISOString() });

  it('cuenta solo los archivos de las últimas 24 horas', () => {
    expect(archivosEnUltimas24h([hace(1), hace(23), hace(25), hace(200)], AHORA)).toBe(2);
    expect(archivosEnUltimas24h([], AHORA)).toBe(0);
  });

  it('un uso normal nunca lo toca; un script que sube sin parar sí', () => {
    expect(superaTopeDiario([hace(1), hace(2), hace(3)], AHORA)).toBe(false);
    const abuso = Array.from({ length: TOPE_DIARIO_ARCHIVOS }, (_, i) => hace(i / 10));
    expect(superaTopeDiario(abuso, AHORA)).toBe(true);
    expect(superaTopeDiario(abuso.slice(1), AHORA)).toBe(false);
  });

  it('al día siguiente se puede volver a subir', () => {
    const ayer = Array.from({ length: TOPE_DIARIO_ARCHIVOS + 5 }, () => hace(30));
    expect(superaTopeDiario(ayer, AHORA)).toBe(false);
  });
});
