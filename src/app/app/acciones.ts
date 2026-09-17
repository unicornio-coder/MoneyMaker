'use server';

import { revalidatePath } from 'next/cache';
import { contexto } from '@/lib/data/contexto';
import { conectarLink, sincronizarLink } from '@/lib/services/conectar';
import { recalcular } from '@/lib/services/ingest';
import { infoBanco } from '@/lib/domain/comercios';

type R = { ok: true } | { ok: false; error: string };

function revalidarTodo() {
  for (const p of ['/app', '/app/gastos', '/app/fijos', '/app/presupuesto', '/app/insights', '/app/patrimonio']) revalidatePath(p);
}

/** Modo mock: "conecta" una institución simulada. */
export async function conectarInstitucion(institucionId: string, nombre: string): Promise<R> {
  const { usuario, repo } = await contexto();
  const r = await conectarLink(repo, usuario.id, institucionId, nombre);
  revalidarTodo();
  return r.ok ? { ok: true } : { ok: false, error: 'No pudimos conectar esa cuenta. Intenta de nuevo.' };
}

/** Belvo: el widget ya creó el link; registramos y sincronizamos. */
export async function registrarLinkBelvo(link: string, institution: string): Promise<R> {
  const { usuario, repo } = await contexto();
  const info = infoBanco(institution.replace(/_mx.*$/i, '').replace(/_/g, ' '));
  const r = await conectarLink(repo, usuario.id, link, info.nombre);
  revalidarTodo();
  return r.ok ? { ok: true } : { ok: false, error: 'La conexión se creó pero no pudimos descargar tus movimientos. Lo reintentamos en la próxima sincronización.' };
}

/** Refresco al abrir la app: sincroniza todos los links automáticos del usuario. */
export async function sincronizarTodo(): Promise<{ ok: boolean; actualizados: number }> {
  const { usuario, repo } = await contexto();
  const links = await repo.links(usuario.id);
  let actualizados = 0;
  for (const l of links.filter((x) => (x.proveedor === 'belvo' || x.proveedor === 'manual') && x.externalId)) {
    const r = await sincronizarLink(repo, usuario.id, l.id, l.externalId!, l.proveedor === 'belvo' ? 'belvo' : 'manual', 3);
    if (r.ok) actualizados += r.insertados;
  }
  if (actualizados) revalidarTodo();
  return { ok: true, actualizados };
}

export async function recalcularTodo(): Promise<void> {
  const { usuario, repo } = await contexto();
  await recalcular(repo, usuario.id);
  revalidarTodo();
}

export async function corregirCategoria(movimientoId: string, categoriaId: string, aplicarAComercio: boolean): Promise<R> {
  const { usuario, repo } = await contexto();
  const m = await repo.actualizarMovimiento(usuario.id, movimientoId, { categoriaId, categoriaFuente: 'usuario' });
  if (!m) return { ok: false, error: 'No encontramos el movimiento.' };
  if (aplicarAComercio) {
    const { normalizar } = await import('@/lib/domain/categorizar');
    const patron = normalizar(m.comercio);
    await repo.guardarCorreccionComercio(usuario.id, { patron, nombre: m.comercio, dominio: m.comercioDominio ?? null, categoriaId, esSuscripcion: categoriaId === 'suscripciones' });
    const iguales = (await repo.movimientos(usuario.id)).filter((x) => x.id !== m.id && normalizar(x.comercio) === patron);
    for (const x of iguales) await repo.actualizarMovimiento(usuario.id, x.id, { categoriaId, categoriaFuente: 'usuario' });
  }
  await recalcular(repo, usuario.id);
  revalidarTodo();
  return { ok: true };
}

export async function agregarEfectivo(concepto: string, monto: number, fecha?: string): Promise<R> {
  const { usuario, repo } = await contexto();
  if (!concepto.trim() || !(monto > 0)) return { ok: false, error: 'Escribe un concepto y un monto mayor a cero.' };
  let efectivo = (await repo.cuentas(usuario.id)).find((c) => c.tipo === 'efectivo');
  if (!efectivo) efectivo = await repo.guardarCuenta(usuario.id, { nombre: 'Efectivo', banco: 'Efectivo', tipo: 'efectivo', saldo: 0, color: '#16A34A', activo: true });
  const { ingerirMovimientos } = await import('@/lib/services/ingest');
  await ingerirMovimientos(repo, usuario.id, efectivo, [{ fecha: fecha ?? new Date().toISOString().slice(0, 10), descripcion: concepto.trim(), monto, esAbono: false }], 'manual');
  revalidarTodo();
  return { ok: true };
}
