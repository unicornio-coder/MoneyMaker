import { cache } from 'react';
import { usuarioActual } from '@/lib/auth/session';
import { MODO_MOCK } from '@/lib/supabase/env';
import { getRepo } from './index';
import { asegurarDemo } from './seed';
import type { Perfil } from '@/lib/domain/tipos';

/** Usuario + repo + perfil para Server Components y acciones. En modo mock siembra el demo la primera vez. */
export const contexto = cache(async () => {
  const usuario = await usuarioActual();
  const repo = getRepo();
  if (MODO_MOCK) await asegurarDemo(repo, usuario.id);
  let perfil = await repo.perfil(usuario.id);
  if (!perfil) perfil = await repo.guardarPerfil(usuario.id, { email: usuario.email, nombre: usuario.nombre });
  return { usuario, repo, perfil: perfil as Perfil, diasPago: perfil.diasPago ?? [5, 20] };
});
