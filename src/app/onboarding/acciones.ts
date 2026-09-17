'use server';

import { contexto } from '@/lib/data/contexto';
import { proponerPresupuesto, excedenteInvertible } from '@/lib/domain/presupuesto';
import { estimarIngresoQuincenal } from '@/lib/services/ingest';

/** Cifras para el paso Resumen: lo que ya encontramos con las cuentas conectadas. */
export async function resumenOnboarding() {
  const { usuario, repo, perfil, diasPago } = await contexto();
  const [cuentas, movs, recs] = await Promise.all([repo.cuentas(usuario.id), repo.movimientos(usuario.id), repo.recurrentes(usuario.id)]);
  const activos = recs.filter((r) => r.activo);
  const ingreso = perfil.ingresoQuincenal ?? estimarIngresoQuincenal(movs);
  const lineas = proponerPresupuesto(movs, activos, 'q', new Date(), diasPago);
  return {
    cuentas: cuentas.length,
    movimientos: movs.length,
    suscripciones: activos.filter((r) => r.tipo === 'suscripcion').length,
    suscripcionesMensual: activos.filter((r) => r.tipo === 'suscripcion').reduce((s, r) => s + r.monto, 0),
    msi: activos.filter((r) => r.tipo === 'msi').length,
    msiMensual: activos.filter((r) => r.tipo === 'msi').reduce((s, r) => s + r.monto, 0),
    ingresoQuincenal: ingreso,
    excedente: excedenteInvertible(ingreso, lineas),
    lineas: lineas.length,
  };
}
