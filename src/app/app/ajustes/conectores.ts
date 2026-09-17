'use server';

import { revalidatePath } from 'next/cache';
import { contexto } from '@/lib/data/contexto';
import { conectarBitso, desconectarBitso, sincronizarBitso } from '@/lib/services/bitso';
import { desconectarGmail, sincronizarGmail } from '@/lib/services/gmail';
import { registrar } from '@/lib/services/analytics';

const rev = () => ['/app', '/app/ajustes', '/app/inversiones', '/app/gastos'].forEach((p) => revalidatePath(p));

export async function guardarLlavesBitso(key: string, secret: string) {
  const { usuario, repo } = await contexto();
  if (!key.trim() || !secret.trim()) return { ok: false as const, error: 'Pega la API key y el API secret.' };
  const r = await conectarBitso(repo, usuario.id, key, secret);
  if (r.ok) await registrar(repo, usuario.id, 'fuente_conectada', { proveedor: 'bitso' });
  rev();
  return r;
}

export async function sincronizarConector(proveedor: 'gmail' | 'bitso') {
  const { usuario, repo } = await contexto();
  const r = proveedor === 'gmail' ? await sincronizarGmail(repo, usuario.id, 30) : await sincronizarBitso(repo, usuario.id);
  rev();
  return r;
}

export async function desconectarConector(proveedor: 'gmail' | 'bitso') {
  const { usuario, repo } = await contexto();
  if (proveedor === 'gmail') await desconectarGmail(repo, usuario.id);
  else await desconectarBitso(repo, usuario.id);
  rev();
  return { ok: true as const };
}
