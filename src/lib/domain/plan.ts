// Planes: Gratis (para empezar) y Plus (todo). La prueba de 7 días da Plus completo; al terminar, sin suscripción,
// la cuenta baja a Gratis y nada se borra. Lógica pura, sin I/O.

import type { Perfil } from './tipos';

export type Nivel = 'gratis' | 'plus';

/** Precios en pesos, IVA incluido. Anual = 2.6 meses gratis frente al mensual. */
export const PRECIOS = { mes: 149, anio: 1290 } as const;

export const LIMITES_GRATIS = { bancos: 1, pdfsPorMes: 1 } as const;

export type Funcion = 'cancelacion' | 'negociacion' | 'reportes' | 'tiempo_real' | 'exportar';

const SOLO_PLUS: ReadonlySet<Funcion> = new Set(['cancelacion', 'negociacion', 'reportes', 'tiempo_real', 'exportar']);

/** Nivel efectivo del usuario ahora: Plus si paga o si la prueba sigue viva; Gratis en cualquier otro caso. */
export function nivelPlan(perfil: Pick<Perfil, 'plan' | 'trialTermina' | 'planRenueva'>, ahora: Date = new Date()): Nivel {
  if (perfil.plan === 'plus') return 'plus';
  if (perfil.plan === 'trial') {
    const fin = perfil.planRenueva ?? perfil.trialTermina;
    return fin && new Date(fin).getTime() > ahora.getTime() ? 'plus' : 'gratis';
  }
  return 'gratis';
}

export function incluye(nivel: Nivel, f: Funcion): boolean {
  return nivel === 'plus' || !SOLO_PLUS.has(f);
}

/** Bancos conectados que cuentan para el límite: los automáticos (Belvo) activos. */
export function puedeConectarBanco(nivel: Nivel, bancosConectados: number): boolean {
  return nivel === 'plus' || bancosConectados < LIMITES_GRATIS.bancos;
}

/** PDFs subidos en el mes en curso (los que llegaron a revisión o se confirmaron; los que fallaron no cuentan). */
export function puedeImportarPdf(nivel: Nivel, pdfsEsteMes: number): boolean {
  return nivel === 'plus' || pdfsEsteMes < LIMITES_GRATIS.pdfsPorMes;
}

/** Cuenta importaciones válidas dentro del mes civil de `hoy` (fechas ISO). */
export function importacionesDelMes(importaciones: { createdAt: string; estado: string }[], hoy: string): number {
  const mes = hoy.slice(0, 7);
  return importaciones.filter((i) => i.createdAt.slice(0, 7) === mes && i.estado !== 'error').length;
}

export const TEXTO_LIMITE = {
  bancos: 'En el plan Gratis puedes conectar un banco. Pásate a Plus para conectar todos.',
  pdfs: 'En el plan Gratis puedes subir un estado de cuenta al mes. Pásate a Plus para subir los que quieras.',
  cancelacion: '"Cancelar por mí" es de Plus. Puedes cancelar tú con la guía y el enlace directo.',
  negociacion: 'Negociar tu tarifa es de Plus.',
  exportar: 'Exportar tus movimientos es de Plus.',
} as const;

/** Cuánto ahorra el plan anual frente a pagar 12 meses. */
export function ahorroAnual(): number {
  return PRECIOS.mes * 12 - PRECIOS.anio;
}
