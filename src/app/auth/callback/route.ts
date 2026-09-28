import { NextResponse, type NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

/** Intercambia el código de OAuth / confirmación de correo por una sesión. */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') || '/app';
  if (code) {
    const { error } = await supabaseServer().auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }
  // Enlace de correo abierto en otro navegador (sin PKCE): Supabase manda token_hash + type.
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');
  if (tokenHash && (type === 'magiclink' || type === 'email' || type === 'signup' || type === 'recovery')) {
    const { error } = await supabaseServer().auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }
  return NextResponse.redirect(new URL('/login?error=callback', url.origin));
}
