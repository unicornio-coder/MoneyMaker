import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { usuarioActual } from '@/lib/auth/session';
import { gmailConfigurado, urlAutorizacion } from '@/lib/services/gmail';

/** Inicia el consentimiento de Google para leer alertas bancarias. */
export async function GET(req: Request) {
  await usuarioActual();
  const origin = new URL(req.url).origin;
  if (!gmailConfigurado()) return NextResponse.redirect(`${origin}/app/ajustes?sec=fuentes&gmail=noconfig`);
  const state = randomBytes(16).toString('hex');
  cookies().set('mm-gmail-state', state, { httpOnly: true, sameSite: 'lax', secure: origin.startsWith('https'), maxAge: 600, path: '/' });
  return NextResponse.redirect(urlAutorizacion(state));
}
