// Conexión de una fuente automática (Belvo o mock): crea link, guarda cuentas y corre la ingesta.

import { getAggregator } from './aggregator';
import { ingerirMovimientos } from './ingest';
import type { Repo } from '@/lib/data/repo';
import type { FuenteDato } from '@/lib/domain/tipos';
import { infoBanco } from '@/lib/domain/comercios';

export async function conectarLink(repo: Repo, userId: string, linkExternalId: string, institucion: string, meses = 12) {
  const agg = getAggregator();
  const fuente: FuenteDato = agg.nombre === 'belvo' ? 'belvo' : 'manual';
  const info = infoBanco(institucion);
  const link = await repo.guardarLink(userId, { proveedor: agg.nombre === 'belvo' ? 'belvo' : 'manual', externalId: linkExternalId, institucion: info.nombre, institucionDominio: info.dominio, estado: 'pendiente' });
  return sincronizarLink(repo, userId, link.id, linkExternalId, fuente, meses);
}

export async function sincronizarLink(repo: Repo, userId: string, linkId: string, linkExternalId: string, fuente: FuenteDato, meses = 12) {
  const agg = getAggregator();
  const desde = new Date();
  desde.setMonth(desde.getMonth() - meses);
  try {
    const r = await agg.sincronizar(linkExternalId, desde.toISOString().slice(0, 10));
    let insertados = 0;
    const cuentaIds: string[] = [];
    for (const ce of r.cuentas) {
      const cuenta = await repo.guardarCuenta(userId, {
        linkId,
        externalId: ce.externalId,
        nombre: ce.nombre,
        banco: ce.banco,
        bancoDominio: ce.bancoDominio,
        tipo: ce.tipo,
        ultimos4: ce.ultimos4 ?? null,
        saldo: ce.saldo,
        limite: ce.limite ?? null,
        pagoMinimo: ce.pagoMinimo ?? null,
        fechaCorte: ce.fechaCorte ?? null,
        fechaLimite: ce.fechaLimite ?? null,
        color: infoBanco(ce.banco).color,
        activo: true,
      });
      cuentaIds.push(cuenta.id);
      const res = await ingerirMovimientos(repo, userId, cuenta, r.movimientos[ce.externalId] ?? [], fuente);
      insertados += res.insertados;
    }
    await repo.guardarLink(userId, { id: linkId, proveedor: fuente === 'belvo' ? 'belvo' : 'manual', externalId: linkExternalId, institucion: (await repo.links(userId)).find((l) => l.id === linkId)?.institucion ?? '', estado: 'ok', ultimoSync: new Date().toISOString() });
    return { ok: true as const, cuentas: r.cuentas.length, insertados, cuentaIds };
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : String(err);
    const estado = /mfa|token|login|credential/i.test(mensaje) ? 'mfa' : 'roto';
    const l = (await repo.links(userId)).find((x) => x.id === linkId);
    if (l) await repo.guardarLink(userId, { ...l, estado });
    return { ok: false as const, error: mensaje };
  }
}
