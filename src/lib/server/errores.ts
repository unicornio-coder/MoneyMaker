// Registro de errores del servidor y del cliente en la tabla `app_errors` (solo la lee el cliente de servicio).
// Nunca guarda datos financieros ni personales: solo contexto, nombre del error, mensaje recortado y ruta.

import { MODO_MOCK } from '@/lib/supabase/env';
import { supabaseAdmin } from '@/lib/supabase/server';

export type ErrorRegistrable = { contexto: string; mensaje: string; nombre?: string | null; ruta?: string | null; digest?: string | null; userId?: string | null };

const MAX = 300;

/** Quita correos y números largos (tarjetas, cuentas) de un mensaje antes de guardarlo. */
export function limpiarMensaje(m: string): string {
  return m
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[correo]')
    .replace(/\d{8,}/g, '[número]')
    .slice(0, MAX);
}

export async function registrarError(e: ErrorRegistrable): Promise<void> {
  const fila = { contexto: e.contexto.slice(0, 80), nombre: e.nombre?.slice(0, 80) ?? null, mensaje: limpiarMensaje(e.mensaje), ruta: e.ruta?.slice(0, 200) ?? null, digest: e.digest?.slice(0, 64) ?? null, user_id: e.userId ?? null };
  console.error('[error]', fila.contexto, fila.nombre ?? '', fila.digest ?? '');
  if (MODO_MOCK || !process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  try {
    await supabaseAdmin().from('app_errors').insert(fila);
  } catch {
    // El registro nunca rompe la petición original.
  }
}

/** Atajo para catch: `await registrarExcepcion('api/imports', e, { userId })`. */
export async function registrarExcepcion(contexto: string, e: unknown, extra: Partial<ErrorRegistrable> = {}): Promise<void> {
  const err = e instanceof Error ? e : null;
  await registrarError({ contexto, nombre: err?.name ?? typeof e, mensaje: err?.message ?? String(e), ...extra });
}
