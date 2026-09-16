import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './env';

/** Cliente con la sesión del usuario (Server Components, Route Handlers, Server Actions). */
export function supabaseServer() {
  const store = cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get: (name: string) => store.get(name)?.value,
      set: (name: string, value: string, options: CookieOptions) => {
        try {
          store.set({ name, value, ...options });
        } catch {
          // Server Components no pueden escribir cookies; el middleware refresca la sesión.
        }
      },
      remove: (name: string, options: CookieOptions) => {
        try {
          store.set({ name, value: '', ...options });
        } catch {}
      },
    },
  });
}

/** Cliente de servicio (webhooks, jobs). Nunca en el cliente. */
export function supabaseAdmin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY');
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
