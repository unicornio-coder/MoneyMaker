// Back office: lee perfiles, eventos y archivos de todos los usuarios con el cliente de servicio.
// Solo se llama desde /app/admin, después de comprobar que quien entra está en ADMIN_EMAILS.
// No lee movimientos, montos ni el contenido de los archivos; de los eventos solo toma el nombre y la marca "sospechosa".

import { resumenBackoffice, type ArchivoAdmin, type EventoAdmin, type PerfilAdmin, type ResumenBackoffice } from '@/lib/domain/backoffice';
import { MODO_MOCK } from '@/lib/supabase/env';
import { supabaseAdmin } from '@/lib/supabase/server';

const TOPE = 1000;

export async function datosBackoffice(ahora = new Date()): Promise<ResumenBackoffice> {
  if (MODO_MOCK) return resumenBackoffice({ perfiles: [], eventos: [], archivos: [], ahora });
  const db = supabaseAdmin();
  const desde = new Date(ahora.getTime() - 30 * 86_400_000).toISOString();
  const [p, e, a] = await Promise.all([
    db.from('profiles').select('id,email,nombre,created_at,onboarding_completo').order('created_at', { ascending: false }).limit(TOPE),
    db.from('events').select('user_id,nombre,props,created_at').gte('created_at', desde).order('created_at', { ascending: false }).limit(TOPE),
    db.from('statement_imports').select('user_id,estado,created_at').order('created_at', { ascending: false }).limit(TOPE),
  ]);
  const error = p.error ?? e.error ?? a.error;
  if (error) throw new Error(`backoffice: ${error.message}`);

  const perfiles: PerfilAdmin[] = ((p.data ?? []) as unknown as { id: string; email: string; nombre: string | null; created_at: string; onboarding_completo: boolean }[]).map((x) => ({ id: x.id, email: x.email, nombre: x.nombre, creado: x.created_at, onboardingCompleto: !!x.onboarding_completo }));
  const eventos: EventoAdmin[] = ((e.data ?? []) as unknown as { user_id: string | null; nombre: string; props: Record<string, unknown> | null; created_at: string }[]).map((x) => ({ userId: x.user_id, nombre: x.nombre, cuando: x.created_at, sospechosa: x.props?.sospechosa === true }));
  const archivos: ArchivoAdmin[] = ((a.data ?? []) as unknown as { user_id: string; estado: string; created_at: string }[]).map((x) => ({ userId: x.user_id, estado: x.estado, cuando: x.created_at }));
  return resumenBackoffice({ perfiles, eventos, archivos, ahora });
}
