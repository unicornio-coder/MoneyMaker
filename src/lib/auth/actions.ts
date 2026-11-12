'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { MODO_MOCK } from '@/lib/supabase/env';
import { supabaseAdmin, supabaseServer } from '@/lib/supabase/server';
import { limitarPeticion, LIMITES } from '@/lib/server/ratelimit';

export type AuthResult = { error?: string };

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function origen() {
  return process.env.NEXT_PUBLIC_APP_URL || `https://${headers().get('host')}`;
}

export async function iniciarSesion(_: AuthResult | undefined, form: FormData): Promise<AuthResult> {
  if (MODO_MOCK) redirect('/app');
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  const password = String(form.get('password') ?? '');
  if (!CORREO.test(email)) return { error: 'Escribe un correo válido.' };
  if (!password) return { error: 'Escribe tu contraseña.' };
  const { error } = await supabaseServer().auth.signInWithPassword({ email, password });
  if (error) return { error: 'Correo o contraseña incorrectos.' };
  redirect(String(form.get('next') || '/app'));
}

/**
 * Crea la cuenta con nombre, correo y contraseña, y manda a iniciar sesión. No depende de ningún correo: la cuenta
 * se crea ya confirmada con el cliente de servicio, porque los enlaces de confirmación se pierden cuando el
 * proveedor de correo los abre antes que el usuario.
 */
export async function registrarse(_: AuthResult | undefined, form: FormData): Promise<AuthResult> {
  if (MODO_MOCK) redirect('/onboarding');
  const nombre = String(form.get('nombre') ?? '').trim().slice(0, 80);
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  const password = String(form.get('password') ?? '');
  if (nombre.length < 2) return { error: 'Escribe tu nombre.' };
  if (!CORREO.test(email)) return { error: 'Escribe un correo válido.' };
  if (password.length < 8) return { error: 'La contraseña necesita al menos 8 caracteres.' };
  const ip = (headers().get('x-forwarded-for') ?? '').split(',')[0].trim() || 'sin-ip';
  const lim = limitarPeticion(`registro:${ip}`, LIMITES.acceso);
  if (!lim.ok) return { error: `Demasiados intentos. Intenta de nuevo en ${Math.ceil(lim.reintentarEnS / 60)} min.` };
  const { error } = await supabaseAdmin().auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { nombre, con_contraseña: true } });
  if (error) {
    const m = error.message.toLowerCase();
    if (m.includes('already') || m.includes('registered') || m.includes('exists')) return { error: 'Ese correo ya tiene cuenta. Inicia sesión o usa "Olvidé mi contraseña" para crear una contraseña.' };
    console.warn('[auth] registro', error.message.slice(0, 120));
    return { error: 'No pudimos crear tu cuenta. Intenta de nuevo.' };
  }
  redirect('/login?cuenta=creada');
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
    options: { redirectTo: `${origen()}/auth/callback?next=${encodeURIComponent(next)}` },
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
