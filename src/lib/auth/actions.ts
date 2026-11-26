'use server';

import { rutaSegura } from './ruta';
import { CORREO, MIN_CONTRASEÑA, decidirAcceso, esCorreoRegistrado, limpiarNombre, motivoFallaEntrada, nombreValido, normalizarCorreo } from './acceso';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { MODO_MOCK } from '@/lib/supabase/env';
import { supabaseAdmin, supabaseServer } from '@/lib/supabase/server';
import { limitarPeticion, LIMITES } from '@/lib/server/ratelimit';

export type AuthResult = { error?: string };

function origen() {
  return process.env.NEXT_PUBLIC_APP_URL || `https://${headers().get('host')}`;
}

/**
 * Resultado de "Continuar". `paso: 'nuevo'` le dice a la pantalla que ese correo no tiene cuenta y que pida el nombre;
 * `email` es el correo que se revisó, para que la UI oculte el nombre si la persona cambia el correo. `campo` indica
 * junto a qué campo va el error; sin campo, el error es general. `olvido` muestra el enlace a "Olvidé mi contraseña".
 */
export type AccesoResult = {
  paso?: 'nuevo';
  email?: string;
  campo?: 'email' | 'password' | 'nombre';
  error?: string;
  olvido?: boolean;
};

/** Intentos fallidos por IP antes de frenar: cubre adivinar contraseñas y sondear qué correos tienen cuenta. */
const INTENTOS_FALLIDOS = { max: 20, ventanaMs: 15 * 60_000 };
const ERROR_GENERAL = 'No pudimos continuar. Intenta de nuevo en un momento.';

function ipCliente() {
  return (headers().get('x-forwarded-for') ?? '').split(',')[0].trim() || 'sin-ip';
}

function minutos(s: number) {
  return Math.ceil(s / 60);
}

/** ¿Ese correo ya tiene cuenta? El trigger de alta llena `profiles.email`; se consulta con el cliente de servicio. */
async function correoTieneCuenta(email: string): Promise<boolean | null> {
  try {
    const { data, error } = await supabaseAdmin().from('profiles').select('id').eq('email', email).limit(1);
    if (error) throw error;
    return (data ?? []).length > 0;
  } catch {
    console.warn('[auth] continuar: no se pudo revisar si la cuenta existe');
    return null;
  }
}

/**
 * Acceso único: correo + contraseña + "Continuar".
 * - Si la contraseña coincide, entra a `next` (ruta interna) o a /app.
 * - Si la cuenta existe y no coincide, lo dice y ofrece "Olvidé mi contraseña".
 * - Si no existe, regresa `paso: 'nuevo'` para pedir el nombre en la misma pantalla; con el nombre, crea la cuenta
 *   ya confirmada (sin correo de confirmación: los enlaces se pierden cuando el proveedor de correo los abre antes que
 *   la persona), abre la sesión y manda a /onboarding.
 */
export async function continuarConCorreo(_: AccesoResult | undefined, form: FormData): Promise<AccesoResult> {
  const traeNombre = form.get('nombre') !== null;
  const email = normalizarCorreo(form.get('email'));
  const password = String(form.get('password') ?? '');
  const nombre = limpiarNombre(form.get('nombre'));
  if (!CORREO.test(email)) return { campo: 'email', error: 'Escribe un correo válido.' };
  if (!password) return { campo: 'password', error: 'Escribe tu contraseña.' };
  // En demo no hay Auth real: se entra al panel (o a onboarding si se está creando la cuenta).
  if (MODO_MOCK) redirect(traeNombre ? '/onboarding' : '/app');

  const supabase = supabaseServer();
  const { error: errorEntrada } = await supabase.auth.signInWithPassword({ email, password });
  if (!errorEntrada) redirect(rutaSegura(form.get('next')));

  const motivo = motivoFallaEntrada(errorEntrada);
  if (motivo === 'otro') {
    console.warn('[auth] continuar: falla al entrar', errorEntrada.status ?? '');
    return { error: ERROR_GENERAL };
  }
  if (motivo === 'sin-confirmar') {
    return { error: 'Tu cuenta aún no está confirmada. Crea una contraseña nueva para entrar.', olvido: true };
  }

  const lim = limitarPeticion(`continuar:${ipCliente()}`, INTENTOS_FALLIDOS);
  if (!lim.ok) return { error: `Demasiados intentos. Intenta de nuevo en ${minutos(lim.reintentarEnS)} min.` };

  const existe = await correoTieneCuenta(email);
  if (existe === null) return { error: ERROR_GENERAL };

  const contraseñaIncorrecta: AccesoResult = { campo: 'password', error: 'Esa contraseña no coincide con tu cuenta.', olvido: true };
  const decision = decidirAcceso({ entró: false, existe, traeNombre });
  if (decision === 'contraseña') return contraseñaIncorrecta;

  const nuevo = { paso: 'nuevo', email } as const;
  const corta = password.length < MIN_CONTRASEÑA ? { ...nuevo, campo: 'password', error: `Para crear tu cuenta, usa al menos ${MIN_CONTRASEÑA} caracteres.` } as const : null;
  if (decision === 'pedir-nombre') return corta ?? nuevo;

  // decision === 'crear'
  if (!nombreValido(nombre)) return { ...nuevo, campo: 'nombre', error: 'Escribe tu nombre.' };
  if (corta) return corta;
  const limAlta = limitarPeticion(`registro:${ipCliente()}`, LIMITES.acceso);
  if (!limAlta.ok) return { ...nuevo, error: `Demasiados intentos. Intenta de nuevo en ${minutos(limAlta.reintentarEnS)} min.` };
  const { error: errorAlta } = await supabaseAdmin().auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { nombre, con_contraseña: true } });
  if (errorAlta) {
    // El correo sí tenía cuenta aunque no apareció su perfil: es la contraseña, no una cuenta nueva.
    if (esCorreoRegistrado(errorAlta)) return contraseñaIncorrecta;
    if (errorAlta.code === 'weak_password') return { ...nuevo, campo: 'password', error: 'Esa contraseña es muy fácil de adivinar. Elige otra.' };
    console.warn('[auth] continuar: no se pudo crear la cuenta', errorAlta.status ?? '');
    return { ...nuevo, error: 'No pudimos crear tu cuenta. Intenta de nuevo.' };
  }
  const { error: errorSesion } = await supabase.auth.signInWithPassword({ email, password });
  if (errorSesion) {
    console.warn('[auth] continuar: cuenta creada, sesión pendiente', errorSesion.status ?? '');
    return { error: 'Tu cuenta quedó creada. Presiona Continuar para entrar.' };
  }
  redirect('/onboarding');
}

/** Contraseña opcional para las próximas veces (onboarding, paso 1). Con sesión activa. */
export async function crearContraseña(password: string): Promise<AuthResult> {
  if (password.length < 8) return { error: 'La contraseña necesita al menos 8 caracteres.' };
  if (MODO_MOCK) return {};
  const { error } = await supabaseServer().auth.updateUser({ password, data: { con_contraseña: true } });
  return error ? { error: 'No pudimos guardar la contraseña. Puedes crearla después desde Ajustes.' } : {};
}

export async function entrarConGoogle(next = '/app') {
  if (MODO_MOCK) redirect('/app');
  const { data, error } = await supabaseServer().auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${origen()}/auth/callback?next=${encodeURIComponent(rutaSegura(next))}` },
  });
  if (error || !data.url) redirect('/login?error=google');
  redirect(data.url);
}

/** Manda el enlace de recuperación. Responde igual exista o no la cuenta (no revela correos). */
export async function recuperarContraseña(_: (AuthResult & { enviado?: boolean }) | undefined, form: FormData): Promise<AuthResult & { enviado?: boolean }> {
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  if (!CORREO.test(email)) return { error: 'Escribe un correo válido.' };
  if (MODO_MOCK) return { enviado: true };
  const lim = limitarPeticion(`acceso:${email}`, LIMITES.acceso);
  if (!lim.ok) return { error: `Ya te mandamos varios correos. Revisa tu bandeja o intenta en ${Math.ceil(lim.reintentarEnS / 60)} min.` };
  await supabaseServer().auth.resetPasswordForEmail(email, { redirectTo: `${origen()}/auth/callback?next=/restablecer` });
  return { enviado: true };
}

/**
 * Guarda la contraseña nueva. Dos caminos:
 * - El correo trae `token_hash` (plantilla que apunta a /restablecer): el enlace se canjea aquí, al mandar el
 *   formulario, y no al abrirlo. Así no lo gasta el antivirus o el lector de correo que abre los enlaces antes.
 * - Ya hay sesión de recuperación (enlace clásico que pasó por /auth/callback).
 */
export async function cambiarContraseña(_: AuthResult | undefined, form: FormData): Promise<AuthResult> {
  const password = String(form.get('password') ?? '');
  const tokenHash = String(form.get('token_hash') ?? '');
  if (password.length < 8) return { error: 'La contraseña necesita al menos 8 caracteres.' };
  if (MODO_MOCK) redirect('/app');
  const supabase = supabaseServer();
  if (tokenHash) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' });
    if (error) return { error: 'El enlace ya no es válido o ya se usó. Pide uno nuevo desde "Olvidé mi contraseña".' };
  }
  const { error } = await supabase.auth.updateUser({ password, data: { con_contraseña: true } });
  if (error) return { error: error.message.toLowerCase().includes('different') ? 'Elige una contraseña distinta a la anterior.' : 'El enlace ya no es válido. Pide uno nuevo desde "Olvidé mi contraseña".' };
  redirect('/app');
}

export async function cerrarSesion() {
  if (!MODO_MOCK) await supabaseServer().auth.signOut();
  redirect('/login');
}
