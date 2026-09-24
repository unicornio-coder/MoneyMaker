'use server';

import { revalidatePath } from 'next/cache';
import { contexto } from '@/lib/data/contexto';
import { conectarLink, sincronizarLink } from '@/lib/services/conectar';
import { recalcular } from '@/lib/services/ingest';
import { infoBanco } from '@/lib/domain/comercios';
import { registrar } from '@/lib/services/analytics';

export type ResultadoConexion = { cuentas: number; movimientos: number; suscripciones: number };
type R = { ok: true; resultado?: ResultadoConexion } | { ok: false; error: string };

async function resumenConexion(repo: Awaited<ReturnType<typeof contexto>>['repo'], userId: string, cuentaIds: string[]): Promise<ResultadoConexion> {
  const ids = new Set(cuentaIds);
  const [recs, movs] = await Promise.all([repo.recurrentes(userId), repo.movimientos(userId)]);
  return { cuentas: cuentaIds.length, movimientos: movs.filter((m) => ids.has(m.cuentaId)).length, suscripciones: recs.filter((r) => r.activo && r.tipo === 'suscripcion').length };
}

function revalidarTodo() {
  for (const p of ['/app', '/app/gastos', '/app/fijos', '/app/presupuesto', '/app/insights', '/app/patrimonio']) revalidatePath(p);
}

/** Modo mock: "conecta" una institución simulada. */
export async function conectarInstitucion(institucionId: string, nombre: string): Promise<R> {
  const { usuario, repo } = await contexto();
  const r = await conectarLink(repo, usuario.id, institucionId, nombre);
  if (r.ok) await registrar(repo, usuario.id, 'fuente_conectada', { proveedor: 'mock', institucion: nombre });
  revalidarTodo();
  return r.ok ? { ok: true, resultado: await resumenConexion(repo, usuario.id, r.cuentaIds) } : { ok: false, error: 'No pudimos conectar esa cuenta. Intenta de nuevo.' };
}

/** Belvo: el widget ya creó el link; registramos y sincronizamos. */
export async function registrarLinkBelvo(link: string, institution: string): Promise<R> {
  const { usuario, repo } = await contexto();
  const info = infoBanco(institution.replace(/_mx.*$/i, '').replace(/_/g, ' '));
  const r = await conectarLink(repo, usuario.id, link, info.nombre);
  if (r.ok) await registrar(repo, usuario.id, 'fuente_conectada', { proveedor: 'belvo', institucion: info.nombre });
  revalidarTodo();
  return r.ok ? { ok: true, resultado: await resumenConexion(repo, usuario.id, r.cuentaIds) } : { ok: false, error: 'La conexión se creó pero no pudimos descargar tus movimientos. Lo reintentamos en la próxima sincronización.' };
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

/** Acepta los días de quincena (e ingreso) detectados en la nómina y rearma presupuesto e insights. */
export async function aplicarDiasDePago(dias: number[], ingresoQuincenal?: number | null): Promise<R> {
  const { usuario, repo } = await contexto();
  const limpios = Array.from(new Set(dias.map((d) => Math.round(d)).filter((d) => d >= 1 && d <= 31))).sort((a, b) => a - b);
  if (!limpios.length || limpios.length > 2) return { ok: false, error: 'Elige uno o dos días del mes.' };
  await repo.guardarPerfil(usuario.id, { diasPago: limpios, ...(ingresoQuincenal && ingresoQuincenal > 0 ? { ingresoQuincenal: Math.round(ingresoQuincenal) } : {}) });
  await recalcular(repo, usuario.id);
  revalidarTodo();
  return { ok: true };
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

/** Nota libre del usuario en un movimiento (máximo 200 caracteres). */
export async function guardarNota(movimientoId: string, nota: string): Promise<R> {
  const { usuario, repo } = await contexto();
  const limpia = nota.replace(/\s+/g, ' ').trim().slice(0, 200);
  const m = await repo.actualizarMovimiento(usuario.id, movimientoId, { nota: limpia || null });
  if (!m) return { ok: false, error: 'No encontramos el movimiento.' };
  revalidarTodo();
  return { ok: true };
}
