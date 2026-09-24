import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { usuarioActual } from '@/lib/auth/session';
import { outlookConfigurado, urlAutorizacionOutlook } from '@/lib/services/outlook';

/** Inicia el consentimiento de Microsoft para leer alertas bancarias y recibos en Outlook / Hotmail. */
export async function GET(req: Request) {
  await usuarioActual();
  const origin = new URL(req.url).origin;
  if (!outlookConfigurado()) return NextResponse.redirect(`${origin}/app/ajustes?sec=fuentes&outlook=noconfig`);
  const state = randomBytes(16).toString('hex');
  cookies().set('mm-outlook-state', state, { httpOnly: true, sameSite: 'lax', secure: origin.startsWith('https'), maxAge: 600, path: '/' });
  return NextResponse.redirect(urlAutorizacionOutlook(state));
}
