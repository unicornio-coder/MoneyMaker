'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { MODO_MOCK } from '@/lib/supabase/env';
import { supabaseServer } from '@/lib/supabase/server';

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

export async function registrarse(_: AuthResult | undefined, form: FormData): Promise<AuthResult> {
  if (MODO_MOCK) redirect('/onboarding');
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  const password = String(form.get('password') ?? '');
  if (!CORREO.test(email)) return { error: 'Escribe un correo válido.' };
  if (password.length < 8) return { error: 'La contraseña necesita al menos 8 caracteres.' };
  const { error } = await supabaseServer().auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${origen()}/auth/callback?next=/onboarding` },
  });
  if (error) return { error: error.message.includes('already') ? 'Ese correo ya tiene cuenta. Inicia sesión.' : 'No pudimos crear tu cuenta. Intenta de nuevo.' };
  redirect('/onboarding');
}

/**
 * Entrar o crear cuenta con solo el correo: Supabase manda un enlace de un solo uso. Si el correo no existe, se crea
 * la cuenta. Responde igual en todos los casos (no revela si el correo ya tiene cuenta).
 */
export async function entrarConCorreo(_: (AuthResult & { enviado?: boolean; email?: string }) | undefined, form: FormData): Promise<AuthResult & { enviado?: boolean; email?: string }> {
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  const next = String(form.get('next') || '/onboarding');
  if (!CORREO.test(email)) return { error: 'Escribe un correo válido.' };
  if (MODO_MOCK) redirect(next.startsWith('/') ? next : '/onboarding');
  const { error } = await supabaseServer().auth.signInWithOtp({ email, options: { shouldCreateUser: true, emailRedirectTo: `${origen()}/auth/callback?next=${encodeURIComponent(next)}` } });
  if (error) return { error: error.message.toLowerCase().includes('rate') ? 'Ya te mandamos un enlace hace poco. Revisa tu correo (y la carpeta de spam).' : 'No pudimos mandar el enlace. Intenta de nuevo en un momento.' };
  return { enviado: true, email };
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
  await supabaseServer().auth.resetPasswordForEmail(email, { redirectTo: `${origen()}/auth/callback?next=/restablecer` });
  return { enviado: true };
}

/** Cambia la contraseña con la sesión que abrió el enlace del correo. */
export async function cambiarContraseña(_: AuthResult | undefined, form: FormData): Promise<AuthResult> {
  const password = String(form.get('password') ?? '');
  if (password.length < 8) return { error: 'La contraseña necesita al menos 8 caracteres.' };
  if (MODO_MOCK) redirect('/app');
  const { error } = await supabaseServer().auth.updateUser({ password });
  if (error) return { error: 'El enlace ya no es válido. Pide uno nuevo desde "Olvidé mi contraseña".' };
  redirect('/app');
}

export async function cerrarSesion() {
  if (!MODO_MOCK) await supabaseServer().auth.signOut();
  redirect('/login');
}
