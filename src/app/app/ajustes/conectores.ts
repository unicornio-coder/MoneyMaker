'use server';

import { revalidatePath } from 'next/cache';
import { contexto } from '@/lib/data/contexto';
import { conectarBitso, desconectarBitso, sincronizarBitso } from '@/lib/services/bitso';
import { desconectarGmail, sincronizarGmail } from '@/lib/services/gmail';
import { desconectarOutlook, sincronizarOutlook } from '@/lib/services/outlook';
import { registrar } from '@/lib/services/analytics';
import { aliasCorreo, crearTokenDispositivo, dominioCorreoEntrante } from '@/lib/services/entrada';
import { sincronizarLink } from '@/lib/services/conectar';

const rev = () => ['/app', '/app/ajustes', '/app/inversiones', '/app/gastos'].forEach((p) => revalidatePath(p));

export async function guardarLlavesBitso(key: string, secret: string) {
  const { usuario, repo } = await contexto();
  if (!key.trim() || !secret.trim()) return { ok: false as const, error: 'Pega la API key y el API secret.' };
  const r = await conectarBitso(repo, usuario.id, key, secret);
  if (r.ok) await registrar(repo, usuario.id, 'fuente_conectada', { proveedor: 'bitso' });
  rev();
  return r;
}

export async function sincronizarConector(proveedor: 'gmail' | 'outlook' | 'bitso') {
  const { usuario, repo } = await contexto();
  const r = proveedor === 'gmail' ? await sincronizarGmail(repo, usuario.id, 30) : proveedor === 'outlook' ? await sincronizarOutlook(repo, usuario.id, 30) : await sincronizarBitso(repo, usuario.id);
  rev();
  return r;
}

export async function desconectarConector(proveedor: 'gmail' | 'outlook' | 'bitso') {
  const { usuario, repo } = await contexto();
  if (proveedor === 'gmail') await desconectarGmail(repo, usuario.id);
  else if (proveedor === 'outlook') await desconectarOutlook(repo, usuario.id);
  else await desconectarBitso(repo, usuario.id);
  rev();
  return { ok: true as const };
}

/** Token para la app Android (se muestra una vez). Crear otro invalida el anterior. */
export async function generarTokenDispositivo() {
  const { usuario, repo } = await contexto();
  const token = await crearTokenDispositivo(repo, usuario.id);
  await registrar(repo, usuario.id, 'fuente_conectada', { proveedor: 'dispositivo' });
  rev();
  return { ok: true as const, token };
}

/** Dirección de reenvío del usuario (estable). */
export async function obtenerCorreoReenvio() {
  const { usuario, repo } = await contexto();
  const alias = await aliasCorreo(repo, usuario.id);
  rev();
  return { ok: true as const, direccion: `${alias}@${dominioCorreoEntrante()}`, activo: !!process.env.CORREO_ENTRANTE_SECRET };
}

/** "Actualizar ahora" de una conexión bancaria (Belvo o demo): baja los últimos 3 meses y recalcula. */
export async function actualizarFuente(linkId: string) {
  const { usuario, repo } = await contexto();
  const link = (await repo.links(usuario.id)).find((l) => l.id === linkId);
  if (!link || !link.externalId || (link.proveedor !== 'belvo' && link.proveedor !== 'manual')) return { ok: false as const, error: 'Esta conexión no se actualiza sola: sube el estado de cuenta más reciente.' };
  const r = await sincronizarLink(repo, usuario.id, link.id, link.externalId, link.proveedor === 'belvo' ? 'belvo' : 'manual', 3);
  rev();
  return r.ok ? { ok: true as const, insertados: r.insertados } : { ok: false as const, error: r.error ?? 'No se pudo actualizar. Si el banco pide un código, vuelve a conectar.' };
}
