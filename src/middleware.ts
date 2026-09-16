import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { MODO_MOCK, SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/supabase/env';

const PUBLICAS = ['/login', '/registro', '/auth', '/manifest.webmanifest', '/icon.svg'];

export async function middleware(req: NextRequest) {
  if (MODO_MOCK) return NextResponse.next();

  let res = NextResponse.next({ request: { headers: req.headers } });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get: (name: string) => req.cookies.get(name)?.value,
      set: (name: string, value: string, options: CookieOptions) => {
        req.cookies.set({ name, value, ...options });
        res = NextResponse.next({ request: { headers: req.headers } });
        res.cookies.set({ name, value, ...options });
      },
      remove: (name: string, options: CookieOptions) => {
        req.cookies.set({ name, value: '', ...options });
        res = NextResponse.next({ request: { headers: req.headers } });
        res.cookies.set({ name, value: '', ...options });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = req.nextUrl;
  const esPublica = PUBLICAS.some((p) => pathname.startsWith(p));

  if (!user && !esPublica) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  if (user && (pathname === '/login' || pathname === '/registro')) {
    const url = req.nextUrl.clone();
    url.pathname = '/app';
    url.search = '';
    return NextResponse.redirect(url);
  }
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico|webmanifest)$).*)'],
};
