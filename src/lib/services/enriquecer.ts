// Enriquecimiento: casa los recibos leídos por correo con los movimientos del banco y escribe el detalle.
// Los recibos sin pareja se guardan (resumen, sin correo) en la credencial de Gmail para casarlos cuando llegue el cargo.

import type { Repo } from '@/lib/data/repo';
import { aISO, sumarDias } from '@/lib/domain/fechas';
import { casarRecibo, type Recibo } from './recibos';

const MAX_PENDIENTES = 200;
const DIAS_VIGENCIA = 45;

type Pendiente = Recibo & { desde: string };

async function pendientes(repo: Repo, userId: string): Promise<{ lista: Pendiente[]; guardar: (l: Pendiente[]) => Promise<void> }> {
  const cred = await repo.credencial(userId, 'gmail').catch(() => null);
  const lista = ((cred?.datos.recibosPendientes as Pendiente[] | undefined) ?? []).filter((r) => r.desde >= aISO(sumarDias(new Date(), -DIAS_VIGENCIA)));
  return {
    lista,
    guardar: async (l) => {
      if (!cred) return;
      await repo.guardarCredencial(userId, { proveedor: 'gmail', etiqueta: cred.etiqueta, datos: { ...cred.datos, recibosPendientes: l.slice(-MAX_PENDIENTES) } });
    },
  };
}

/** Casa una lista de recibos con los movimientos recientes. Devuelve cuántos se unieron; guarda el resto como pendientes. */
export async function aplicarRecibos(repo: Repo, userId: string, recibos: Recibo[]): Promise<{ casados: number; pendientes: number }> {
  if (!recibos.length) return { casados: 0, pendientes: 0 };
  const desde = aISO(sumarDias(new Date(), -60));
  const movimientos = (await repo.movimientos(userId, { desde })).filter((m) => !m.detalle);
  const usados = new Set<string>();
  const sinPareja: Pendiente[] = [];
  let casados = 0;
  for (const r of recibos) {
    const c = casarRecibo(r, movimientos.filter((m) => !usados.has(m.id)));
    if (!c) {
      sinPareja.push({ ...r, desde: r.fecha });
      continue;
    }
    usados.add(c.movimiento.id);
    await repo.actualizarMovimiento(userId, c.movimiento.id, { detalle: r.detalle, recibo: { comercio: r.comercio, articulos: r.articulos, ...r.meta }, ...(c.movimiento.comercioDominio ? {} : {}) });
    casados++;
  }
  const p = await pendientes(repo, userId);
  await p.guardar([...p.lista, ...sinPareja]);
  return { casados, pendientes: sinPareja.length };
}

/** Después de importar un estado de cuenta: intenta casar los recibos que esperaban su cargo. */
export async function casarRecibosPendientes(repo: Repo, userId: string): Promise<number> {
  const p = await pendientes(repo, userId);
  if (!p.lista.length) return 0;
  const desde = aISO(sumarDias(new Date(), -60));
  const movimientos = (await repo.movimientos(userId, { desde })).filter((m) => !m.detalle);
  const usados = new Set<string>();
  const quedan: Pendiente[] = [];
  let casados = 0;
  for (const r of p.lista) {
    const c = casarRecibo(r, movimientos.filter((m) => !usados.has(m.id)));
    if (!c) {
      quedan.push(r);
      continue;
    }
    usados.add(c.movimiento.id);
    await repo.actualizarMovimiento(userId, c.movimiento.id, { detalle: r.detalle, recibo: { comercio: r.comercio, articulos: r.articulos, ...r.meta } });
    casados++;
  }
  await p.guardar(quedan);
  return casados;
}
