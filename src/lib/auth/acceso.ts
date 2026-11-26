// Lógica pura del acceso único (correo + contraseña + "Continuar"). Sin I/O: la acción del servidor hace las llamadas
// a Supabase y aquí solo se decide qué sigue, para poder probarlo sin red.

export const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const MIN_CONTRASEÑA = 8;

/**
 * Qué hacer después de intentar entrar:
 * - `entrar`: la contraseña coincidió.
 * - `contraseña`: la cuenta existe y la contraseña no coincide.
 * - `pedir-nombre`: la cuenta no existe y aún no sabemos cómo se llama la persona (la UI muestra el campo).
 * - `crear`: la cuenta no existe y ya trae nombre: se crea y entra.
 */
export type DecisionAcceso = 'entrar' | 'contraseña' | 'pedir-nombre' | 'crear';

export function decidirAcceso({ entró, existe, traeNombre }: { entró: boolean; existe: boolean; traeNombre: boolean }): DecisionAcceso {
  if (entró) return 'entrar';
  if (existe) return 'contraseña';
  return traeNombre ? 'crear' : 'pedir-nombre';
}

/** Correo como lo guarda Supabase Auth: sin espacios y en minúsculas. */
export function normalizarCorreo(valor: unknown): string {
  return String(valor ?? '').trim().toLowerCase();
}

export function limpiarNombre(valor: unknown): string {
  return String(valor ?? '').trim().replace(/\s+/g, ' ').slice(0, 80);
}

/** Un nombre necesita al menos dos letras (de cualquier alfabeto); números o signos solos no cuentan. */
export function nombreValido(nombre: string): boolean {
  return (nombre.match(/\p{L}/gu) ?? []).length >= 2;
}

type ErrorAuth = { code?: string; status?: number; message?: string } | null | undefined;

/**
 * Por qué falló signInWithPassword. Solo `credenciales` amerita revisar si la cuenta existe; un error de red o de
 * límite no dice nada de la cuenta y no debe convertirse en "esa contraseña no coincide" ni en "crea tu cuenta".
 */
export function motivoFallaEntrada(error: ErrorAuth): 'credenciales' | 'sin-confirmar' | 'otro' {
  if (!error) return 'otro';
  if (error.code === 'invalid_credentials') return 'credenciales';
  if (error.code === 'email_not_confirmed') return 'sin-confirmar';
  // Servidores de Auth anteriores no mandan `code`: un 400 a secas es credenciales inválidas.
  if (!error.code && error.status === 400) return 'credenciales';
  return 'otro';
}

/** createUser respondió que el correo ya tiene cuenta (por ejemplo, si el perfil no se llegó a crear). */
export function esCorreoRegistrado(error: ErrorAuth): boolean {
  if (!error) return false;
  if (error.code === 'email_exists' || error.code === 'user_already_exists') return true;
  const m = (error.message ?? '').toLowerCase();
  return m.includes('already') || m.includes('registered') || m.includes('exists');
}
