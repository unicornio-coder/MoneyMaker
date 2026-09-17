import { MODO_MOCK } from '@/lib/supabase/env';
import type { Repo } from './repo';
import { repoMemoria } from './repo.memoria';
import { repoSupabase } from './repo.supabase';

/** Repositorio activo: memoria en modo mock, Supabase con llaves. */
export function getRepo(): Repo {
  return MODO_MOCK ? repoMemoria : repoSupabase;
}

export type { Repo } from './repo';
