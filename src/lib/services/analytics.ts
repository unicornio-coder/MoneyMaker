// Eventos de producto: los que definen si el negocio funciona (activación, wow, retención, cancelaciones).
// Se guardan en `events`; en modo mock, en memoria. Nunca contienen montos identificables de comercios.

import type { Repo } from '@/lib/data/repo';

export type EventoProducto =
  | 'registro'
  | 'onboarding_completo'
  | 'fuente_conectada' // props: { proveedor, institucion }
  | 'importacion' // props: { formato, movimientos }
  | 'import_error' // props: { codigo, kb } — nunca el nombre del archivo ni su contenido
  | 'wow_visto' // props: { excedente } — el usuario vio "puedes invertir $X"
  | 'suscripcion_cancelada' // props: { recurrenteId }
  | 'cancelar_por_mi' // props: { recurrenteId }
  | 'presupuesto_editado'
  | 'checkout_iniciado'
  | 'suscripcion_pagada'
  | 'cuenta_borrada';

export async function registrar(repo: Repo, userId: string | null, nombre: EventoProducto, props: Record<string, unknown> = {}) {
  try {
    await repo.registrarEvento(userId, nombre, props);
  } catch {
    // Las métricas nunca rompen el flujo.
  }
}
