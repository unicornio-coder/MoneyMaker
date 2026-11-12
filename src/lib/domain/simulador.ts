// Simulador de inversión periódica. Lógica pura, con test.

/** Valor final de aportar `aporte` cada quincena durante `años`, con un cambio de precio anual constante. */
export function valorFuturo(aporte: number, años: number, anual: number): number {
  const n = años * 24;
  const r = Math.pow(1 + anual, 1 / 24) - 1;
  return Math.abs(r) < 1e-9 ? aporte * n : aporte * ((Math.pow(1 + r, n) - 1) / r);
}
