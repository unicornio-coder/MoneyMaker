import { cache } from 'react';
import { redirect } from 'next/navigation';
import { iniciales } from '@/lib/format';
import { MODO_MOCK } from '@/lib/supabase/env';
import { supabaseServer } from '@/lib/supabase/server';

export type UsuarioSesion = {
  id: string;
  email: string;
  nombre: string;
  nombreCorto: string;
  iniciales: string;
};

export const USUARIO_DEMO: UsuarioSesion = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'demo@moneymaker.mx',
  nombre: 'Juan Costos',
  nombreCorto: 'JC',
  iniciales: 'JC',
};

function nombreCorto(nombre: string, email: string) {
  const primero = nombre.trim().split(/\s+/)[0];
  return primero || email.split('@')[0];
}

/** Usuario de la sesión actual. En modo mock devuelve el usuario demo. Redirige a /login si no hay sesión. */
/** ¿Hay sesión? Sin redirigir: la landing lo usa para ofrecer "Ir a mi panel" en vez de "Empezar". En demo, no. */
export const haySesion = cache(async (): Promise<boolean> => {
  if (MODO_MOCK) return false;
  const {
    data: { user },
  } = await supabaseServer().auth.getUser();
  return !!user;
});

export const usuarioActual = cache(async (): Promise<UsuarioSesion> => {
  if (MODO_MOCK) return USUARIO_DEMO;
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: perfil } = await supabase.from('profiles').select('nombre').eq('id', user.id).maybeSingle();
  const nombre = perfil?.nombre || (user.user_metadata?.nombre as string) || user.email?.split('@')[0] || 'Tú';
  return {
    id: user.id,
    email: user.email ?? '',
    nombre,
    nombreCorto: nombreCorto(nombre, user.email ?? ''),
    iniciales: iniciales(nombre),
  };
});
