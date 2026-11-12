import { NextResponse, type NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

/** Intercambia el código de OAuth / confirmación de correo por una sesión. */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') || '/app';
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');
  // Recuperación con token_hash: no se canjea aquí. Se manda a la pantalla de contraseña nueva y se canjea al guardar,
  // para que abrir el enlace (un lector de correo, un antivirus) no lo gaste.
  if (tokenHash && type === 'recovery') return NextResponse.redirect(new URL(`/restablecer?token_hash=${encodeURIComponent(tokenHash)}`, url.origin));
  if (code) {
    const { error } = await supabaseServer().auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }
  // Enlace de correo abierto en otro navegador (sin PKCE): Supabase manda token_hash + type.
  if (tokenHash && (type === 'magiclink' || type === 'email' || type === 'signup')) {
    const { error } = await supabaseServer().auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }
  // Un enlace de recuperación que ya no sirve regresa a pedir otro, no a la pantalla de entrada.
  if (next.startsWith('/restablecer')) return NextResponse.redirect(new URL('/recuperar?error=enlace', url.origin));
  return NextResponse.redirect(new URL('/login?error=callback', url.origin));
}
