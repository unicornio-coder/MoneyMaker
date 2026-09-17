'use server';

import { revalidatePath } from 'next/cache';
import { contexto } from '@/lib/data/contexto';

export async function marcarInsight(id: string, cambios: { leido?: boolean; descartado?: boolean }) {
  const { usuario, repo } = await contexto();
  await repo.marcarInsight(usuario.id, id, cambios);
  revalidatePath('/app/insights');
  return { ok: true as const };
}
