// Repositorio sobre Supabase. Usa el cliente con la sesión del usuario (RLS decide), salvo en jobs/webhooks
// donde se inyecta el cliente de servicio con `repoSupabaseCon(supabaseAdmin())`.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Activo, Credencial, Cuenta, EventoCalendario, Importacion, Insight, Movimiento, MovimientoNormalizado, Objetivo, Pasivo, Perfil, Presupuesto, Recurrente, ResumenEstado } from '@/lib/domain/tipos';
import { cifrar, descifrar } from '@/lib/crypto';
import { supabaseServer } from '@/lib/supabase/server';
import type { FiltroMovimientos, Link, NuevoInsight, NuevoMovimiento, NuevoRecurrente, Repo } from './repo';

type Fila = Record<string, unknown>;
type Cli = SupabaseClient;

function lanzar(ctx: string, error: { message: string } | null) {
  if (error) throw new Error(`${ctx}: ${error.message}`);
}

const num = (v: unknown) => (v == null ? null : Number(v));
const str = (v: unknown) => (v == null ? null : String(v));

// ---------- mapeos fila ↔ dominio ----------
const aPerfil = (f: Fila): Perfil => ({ id: String(f.id), email: String(f.email), nombre: str(f.nombre), diasPago: (f.dias_pago as number[]) ?? [5, 20], ingresoQuincenal: num(f.ingreso_quincenal), metas: (f.metas as string[]) ?? [], plan: f.plan as Perfil['plan'], trialTermina: String(f.trial_termina), onboardingCompleto: !!f.onboarding_completo, stripeCustomerId: str(f.stripe_customer_id), stripeSubscriptionId: str(f.stripe_subscription_id), planRenueva: str(f.plan_renueva), planIntervalo: (f.plan_intervalo as Perfil['planIntervalo']) ?? null });
const aLink = (f: Fila): Link => ({ id: String(f.id), proveedor: f.proveedor as Link['proveedor'], externalId: str(f.external_id), institucion: String(f.institucion), institucionDominio: str(f.institucion_dominio), estado: f.estado as Link['estado'], ultimoSync: str(f.ultimo_sync) });
const aCuenta = (f: Fila): Cuenta & { externalId: string | null } => ({ id: String(f.id), linkId: str(f.link_id), externalId: str(f.external_id), nombre: String(f.nombre), banco: String(f.banco), bancoDominio: str(f.banco_dominio), tipo: f.tipo as Cuenta['tipo'], ultimos4: str(f.ultimos4), saldo: Number(f.saldo), limite: num(f.limite), pagoMinimo: num(f.pago_minimo), fechaCorte: str(f.fecha_corte), fechaLimite: str(f.fecha_limite), color: str(f.color), activo: !!f.activo });
const aMov = (f: Fila): Movimiento => ({ id: String(f.id), cuentaId: String(f.account_id), fecha: String(f.fecha), descripcionRaw: String(f.descripcion_raw), comercio: String(f.comercio), comercioDominio: str(f.comercio_dominio), monto: Number(f.monto), tipo: f.tipo as Movimiento['tipo'], categoriaId: String(f.categoria_id), categoriaFuente: f.categoria_fuente as Movimiento['categoriaFuente'], esMsi: !!f.es_msi, msiCuota: num(f.msi_cuota), msiTotal: num(f.msi_total), recurrenteId: str(f.recurrent_id), fuente: f.fuente as Movimiento['fuente'], hash: String(f.hash) });
const deMov = (userId: string, m: NuevoMovimiento) => ({ user_id: userId, account_id: m.cuentaId, fecha: m.fecha, descripcion_raw: m.descripcionRaw, comercio: m.comercio, comercio_dominio: m.comercioDominio ?? null, monto: m.monto, tipo: m.tipo, categoria_id: m.categoriaId, categoria_fuente: m.categoriaFuente, es_msi: m.esMsi, msi_cuota: m.msiCuota ?? null, msi_total: m.msiTotal ?? null, recurrent_id: m.recurrenteId ?? null, fuente: m.fuente, hash: m.hash });
const aRec = (f: Fila): Recurrente => ({ id: String(f.id), cuentaId: str(f.account_id), nombre: String(f.nombre), comercioDominio: str(f.comercio_dominio), tipo: f.tipo as Recurrente['tipo'], monto: Number(f.monto), diaCobro: num(f.dia_cobro), frecuencia: f.frecuencia as Recurrente['frecuencia'], primerCargo: str(f.primer_cargo), ultimoCargo: str(f.ultimo_cargo), veces: Number(f.veces), activo: !!f.activo, canceladoAt: str(f.cancelado_at), msiCuotasTotal: num(f.msi_cuotas_total), msiCuotasPagadas: num(f.msi_cuotas_pagadas), msiTermina: str(f.msi_termina), categoriaId: str(f.categoria_id), origen: f.origen as Recurrente['origen'] });
const deRec = (userId: string, r: NuevoRecurrente) => ({ user_id: userId, account_id: r.cuentaId ?? null, nombre: r.nombre, comercio_dominio: r.comercioDominio ?? null, tipo: r.tipo, monto: r.monto, dia_cobro: r.diaCobro ?? null, frecuencia: r.frecuencia, primer_cargo: r.primerCargo ?? null, ultimo_cargo: r.ultimoCargo ?? null, veces: r.veces, activo: r.activo, cancelado_at: r.canceladoAt ?? null, msi_cuotas_total: r.msiCuotasTotal ?? null, msi_cuotas_pagadas: r.msiCuotasPagadas ?? null, msi_termina: r.msiTermina ?? null, categoria_id: r.categoriaId ?? null, origen: r.origen });
const aActivo = (f: Fila): Activo => ({ id: String(f.id), tipo: f.tipo as Activo['tipo'], nombre: String(f.nombre), valor: Number(f.valor), detalle: (f.detalle as Record<string, unknown>) ?? {}, cuentaId: str(f.account_id) });
const aPasivo = (f: Fila): Pasivo => ({ id: String(f.id), tipo: f.tipo as Pasivo['tipo'], nombre: String(f.nombre), saldo: Number(f.saldo), tasa: num(f.tasa), cuentaId: str(f.account_id) });
const aObjetivo = (f: Fila): Objetivo => ({ id: String(f.id), grupo: f.grupo as Objetivo['grupo'], nombre: String(f.nombre), meta: Number(f.meta), avance: Number(f.avance), fecha: str(f.fecha), cuentaId: str(f.account_id), completado: !!f.completado });
const aInsight = (f: Fila): Insight => ({ id: String(f.id), tipo: String(f.tipo), titulo: String(f.titulo), texto: String(f.texto), monto: num(f.monto), ctaLabel: str(f.cta_label), ctaHref: str(f.cta_href), leido: !!f.leido, descartado: !!f.descartado, referencia: (f.referencia as Record<string, unknown>) ?? {}, createdAt: String(f.created_at) });
const aEvento = (f: Fila): EventoCalendario => ({ id: String(f.id), fecha: String(f.fecha), nombre: String(f.nombre), monto: num(f.monto), tipo: f.tipo as EventoCalendario['tipo'], recurrenteId: str(f.recurrent_id) });
const aImportacion = (f: Fila): Importacion => ({
  id: String(f.id),
  archivo: String(f.archivo),
  archivoHash: String(f.archivo_hash),
  tamanoBytes: Number(f.tamano_bytes ?? 0),
  estado: f.estado as Importacion['estado'],
  metodo: (f.metodo as Importacion['metodo']) ?? null,
  resumen: (f.resumen as ResumenEstado) ?? ({} as ResumenEstado),
  movimientos: (f.movimientos as MovimientoNormalizado[]) ?? [],
  advertencias: (f.advertencias as string[]) ?? [],
  cuadre: (f.cuadre as Importacion['cuadre']) ?? null,
  cuentaId: str(f.account_id),
  insertados: Number(f.insertados ?? 0),
  duplicados: Number(f.duplicados ?? 0),
  tokensEntrada: Number(f.tokens_entrada ?? 0),
  tokensSalida: Number(f.tokens_salida ?? 0),
  error: str(f.error),
  createdAt: String(f.created_at),
  updatedAt: String(f.updated_at),
});
const deImportacion = (userId: string, i: Omit<Importacion, 'id' | 'createdAt' | 'updatedAt'>) => ({ user_id: userId, account_id: i.cuentaId ?? null, archivo: i.archivo, archivo_hash: i.archivoHash, tamano_bytes: i.tamanoBytes, estado: i.estado, metodo: i.metodo, resumen: i.resumen, movimientos: i.movimientos, advertencias: i.advertencias, cuadre: i.cuadre, insertados: i.insertados, duplicados: i.duplicados, tokens_entrada: i.tokensEntrada, tokens_salida: i.tokensSalida, error: i.error ?? null, updated_at: new Date().toISOString() });

export function repoSupabaseCon(cli: () => Cli): Repo {
  return {
    async perfil(userId) {
      const { data, error } = await cli().from('profiles').select('*').eq('id', userId).maybeSingle();
      lanzar('perfil', error);
      return data ? aPerfil(data) : null;
    },
    async guardarPerfil(userId, c) {
      // Cambios parciales: UPDATE si el perfil existe (un upsert exigiría todas las columnas not null, como email).
      const fila: Fila = {};
      if (c.email !== undefined) fila.email = c.email;
      if (c.nombre !== undefined) fila.nombre = c.nombre;
      if (c.diasPago !== undefined) fila.dias_pago = c.diasPago;
      if (c.ingresoQuincenal !== undefined) fila.ingreso_quincenal = c.ingresoQuincenal;
      if (c.metas !== undefined) fila.metas = c.metas;
      if (c.plan !== undefined) fila.plan = c.plan;
      if (c.trialTermina !== undefined) fila.trial_termina = c.trialTermina;
      if (c.onboardingCompleto !== undefined) fila.onboarding_completo = c.onboardingCompleto;
      if (c.stripeCustomerId !== undefined) fila.stripe_customer_id = c.stripeCustomerId;
      if (c.stripeSubscriptionId !== undefined) fila.stripe_subscription_id = c.stripeSubscriptionId;
      if (c.planRenueva !== undefined) fila.plan_renueva = c.planRenueva;
      if (c.planIntervalo !== undefined) fila.plan_intervalo = c.planIntervalo;
      if (Object.keys(fila).length) {
        const { data: actualizado, error: eUpd } = await cli().from('profiles').update(fila).eq('id', userId).select('*').maybeSingle();
        lanzar('guardarPerfil', eUpd);
        if (actualizado) return aPerfil(actualizado);
      } else {
        const { data: actual, error: eSel } = await cli().from('profiles').select('*').eq('id', userId).maybeSingle();
        lanzar('guardarPerfil', eSel);
        if (actual) return aPerfil(actual);
      }
      // No existe todavía (el trigger de auth no corrió): lo creamos completo.
      const { data, error } = await cli().from('profiles').insert({ id: userId, email: c.email ?? '', ...fila }).select('*').single();
      lanzar('guardarPerfil', error);
      return aPerfil(data);
    },

    async links(userId) {
      const { data, error } = await cli().from('links').select('*').eq('user_id', userId).order('created_at');
      lanzar('links', error);
      return (data ?? []).map(aLink);
    },
    async guardarLink(userId, l) {
      const fila: Fila = { user_id: userId, proveedor: l.proveedor, external_id: l.externalId ?? null, institucion: l.institucion, institucion_dominio: l.institucionDominio ?? null, estado: l.estado, ultimo_sync: l.ultimoSync ?? null };
      if (l.id) fila.id = l.id;
      const q = l.id ? cli().from('links').upsert(fila) : cli().from('links').upsert(fila, { onConflict: 'user_id,proveedor,external_id' });
      const { data, error } = await q.select('*').single();
      lanzar('guardarLink', error);
      return aLink(data);
    },
    async eliminarLink(userId, linkId) {
      const { error } = await cli().from('links').delete().eq('user_id', userId).eq('id', linkId);
      lanzar('eliminarLink', error);
    },

    async cuentas(userId) {
      const { data, error } = await cli().from('accounts').select('*').eq('user_id', userId).eq('activo', true).order('created_at');
      lanzar('cuentas', error);
      return (data ?? []).map(aCuenta);
    },
    async cuenta(userId, cuentaId) {
      const { data, error } = await cli().from('accounts').select('*').eq('user_id', userId).eq('id', cuentaId).maybeSingle();
      lanzar('cuenta', error);
      return data ? aCuenta(data) : null;
    },
    async guardarCuenta(userId, c) {
      const fila: Fila = { user_id: userId, link_id: c.linkId ?? null, external_id: c.externalId ?? null, nombre: c.nombre, banco: c.banco, banco_dominio: c.bancoDominio ?? null, tipo: c.tipo, ultimos4: c.ultimos4 ?? null, saldo: c.saldo, limite: c.limite ?? null, pago_minimo: c.pagoMinimo ?? null, fecha_corte: c.fechaCorte ?? null, fecha_limite: c.fechaLimite ?? null, color: c.color ?? null, activo: c.activo };
      if (c.id) fila.id = c.id;
      const q = c.id ? cli().from('accounts').upsert(fila) : c.externalId ? cli().from('accounts').upsert(fila, { onConflict: 'user_id,external_id' }) : cli().from('accounts').insert(fila);
      const { data, error } = await q.select('*').single();
      lanzar('guardarCuenta', error);
      return aCuenta(data);
    },
    async eliminarCuenta(userId, cuentaId) {
      const { error } = await cli().from('accounts').delete().eq('user_id', userId).eq('id', cuentaId);
      lanzar('eliminarCuenta', error);
    },

    async movimientos(userId, filtro = {}) {
      let q = cli().from('transactions').select('*').eq('user_id', userId).order('fecha', { ascending: false }).order('monto', { ascending: false });
      if (filtro.desde) q = q.gte('fecha', filtro.desde);
      if (filtro.hasta) q = q.lte('fecha', filtro.hasta);
      if (filtro.cuentaId) q = q.eq('account_id', filtro.cuentaId);
      if (filtro.categoriaId) q = q.eq('categoria_id', filtro.categoriaId);
      if (filtro.tipo) q = q.eq('tipo', filtro.tipo);
      q = q.limit(filtro.limite ?? 5000);
      const { data, error } = await q;
      lanzar('movimientos', error);
      return (data ?? []).map(aMov);
    },
    async insertarMovimientos(userId, movs) {
      if (!movs.length) return [];
      const { data, error } = await cli().from('transactions').upsert(movs.map((m) => deMov(userId, m)), { onConflict: 'user_id,hash', ignoreDuplicates: true }).select('*');
      lanzar('insertarMovimientos', error);
      return (data ?? []).map(aMov);
    },
    async actualizarMovimiento(userId, id, c) {
      const fila: Fila = {};
      if (c.categoriaId !== undefined) fila.categoria_id = c.categoriaId;
      if (c.categoriaFuente !== undefined) fila.categoria_fuente = c.categoriaFuente;
      if (c.comercio !== undefined) fila.comercio = c.comercio;
      if (c.tipo !== undefined) fila.tipo = c.tipo;
      if (c.esMsi !== undefined) fila.es_msi = c.esMsi;
      if (c.msiCuota !== undefined) fila.msi_cuota = c.msiCuota;
      if (c.msiTotal !== undefined) fila.msi_total = c.msiTotal;
      if (c.recurrenteId !== undefined) fila.recurrent_id = c.recurrenteId;
      const { data, error } = await cli().from('transactions').update(fila).eq('user_id', userId).eq('id', id).select('*').maybeSingle();
      lanzar('actualizarMovimiento', error);
      return data ? aMov(data) : null;
    },
    async eliminarMovimiento(userId, id) {
      const { error } = await cli().from('transactions').delete().eq('user_id', userId).eq('id', id);
      lanzar('eliminarMovimiento', error);
    },

    async correccionesComercio(userId) {
      const { data, error } = await cli().from('merchants').select('*').eq('user_id', userId);
      lanzar('correccionesComercio', error);
      return (data ?? []).map((f: Fila) => ({ patron: String(f.patron), nombre: String(f.nombre), dominio: str(f.dominio), categoriaId: String(f.categoria_id), esSuscripcion: !!f.es_suscripcion }));
    },
    async guardarCorreccionComercio(userId, c) {
      const { error } = await cli().from('merchants').upsert({ user_id: userId, patron: c.patron, nombre: c.nombre, dominio: c.dominio, categoria_id: c.categoriaId, es_suscripcion: c.esSuscripcion, fuente: 'usuario' }, { onConflict: 'user_id,patron' });
      lanzar('guardarCorreccionComercio', error);
    },

    async recurrentes(userId) {
      const { data, error } = await cli().from('recurrents').select('*').eq('user_id', userId).order('monto', { ascending: false });
      lanzar('recurrentes', error);
      return (data ?? []).map(aRec);
    },
    async conciliarRecurrentes(userId, detectados) {
      const existentes = await this.recurrentes(userId);
      const clave = (r: Pick<Recurrente, 'cuentaId' | 'nombre' | 'tipo'>) => `${r.cuentaId ?? ''}|${r.nombre.toLowerCase()}|${r.tipo}`;
      const porClave = new Map(existentes.map((r) => [clave(r), r]));
      const vistos = new Set<string>();
      for (const d of detectados) {
        const { movimientoIds, ...datos } = d;
        const ex = porClave.get(clave(d));
        let id: string;
        if (ex && (ex.origen === 'manual' || ex.canceladoAt)) id = ex.id;
        else if (ex) {
          const { error } = await cli().from('recurrents').update(deRec(userId, datos)).eq('id', ex.id);
          lanzar('conciliarRecurrentes.update', error);
          id = ex.id;
        } else {
          const { data, error } = await cli().from('recurrents').insert(deRec(userId, datos)).select('id').single();
          lanzar('conciliarRecurrentes.insert', error);
          id = String(data!.id);
        }
        vistos.add(id);
        if (movimientoIds.length) {
          const { error } = await cli().from('transactions').update({ recurrent_id: id }).eq('user_id', userId).in('id', movimientoIds);
          lanzar('conciliarRecurrentes.vincular', error);
        }
      }
      const desactivar = existentes.filter((r) => !vistos.has(r.id) && r.origen === 'detectado' && !r.canceladoAt && r.activo).map((r) => r.id);
      if (desactivar.length) {
        const { error } = await cli().from('recurrents').update({ activo: false }).in('id', desactivar);
        lanzar('conciliarRecurrentes.desactivar', error);
      }
      return this.recurrentes(userId);
    },
    async guardarRecurrente(userId, r) {
      const fila: Fila = deRec(userId, r);
      if (r.id) fila.id = r.id;
      const { data, error } = await cli().from('recurrents').upsert(fila).select('*').single();
      lanzar('guardarRecurrente', error);
      return aRec(data);
    },
    async eliminarRecurrente(userId, id) {
      const { error } = await cli().from('recurrents').delete().eq('user_id', userId).eq('id', id);
      lanzar('eliminarRecurrente', error);
    },
    async crearSolicitudCancelacion(userId, recurrenteId, notas) {
      const { data, error } = await cli().from('cancel_requests').insert({ user_id: userId, recurrent_id: recurrenteId, notas: notas ?? null }).select('id').single();
      lanzar('crearSolicitudCancelacion', error);
      return { id: String(data!.id) };
    },

    async presupuesto(userId, periodo, inicio) {
      const { data, error } = await cli().from('budgets').select('*, budget_lines(*)').eq('user_id', userId).eq('periodo', periodo).eq('inicio', inicio).maybeSingle();
      lanzar('presupuesto', error);
      if (!data) return null;
      const lineas = ((data.budget_lines as Fila[]) ?? []).map((l) => ({ id: String(l.id), categoriaId: String(l.categoria_id), nombre: str(l.nombre), limite: Number(l.limite), orden: Number(l.orden) })).sort((a, b) => a.orden - b.orden);
      return { id: String(data!.id), periodo, inicio: String(data.inicio), fin: String(data.fin), ingreso: Number(data.ingreso), lineas };
    },
    async guardarPresupuesto(userId, p) {
      const { data, error } = await cli().from('budgets').upsert({ user_id: userId, periodo: p.periodo, inicio: p.inicio, fin: p.fin, ingreso: p.ingreso }, { onConflict: 'user_id,periodo,inicio' }).select('id').single();
      lanzar('guardarPresupuesto', error);
      const id = String(data!.id);
      const { error: e2 } = await cli().from('budget_lines').upsert(p.lineas.map((l) => ({ budget_id: id, user_id: userId, categoria_id: l.categoriaId, nombre: l.nombre ?? null, limite: l.limite, orden: l.orden })), { onConflict: 'budget_id,categoria_id' });
      lanzar('guardarPresupuesto.lineas', e2);
      return (await this.presupuesto(userId, p.periodo, p.inicio)) as Presupuesto;
    },
    async actualizarLineaPresupuesto(userId, presupuestoId, categoriaId, limite) {
      const { error } = await cli().from('budget_lines').upsert({ budget_id: presupuestoId, user_id: userId, categoria_id: categoriaId, limite }, { onConflict: 'budget_id,categoria_id' });
      lanzar('actualizarLineaPresupuesto', error);
    },

    async activos(userId) {
      const { data, error } = await cli().from('assets').select('*').eq('user_id', userId).order('valor', { ascending: false });
      lanzar('activos', error);
      return (data ?? []).map(aActivo);
    },
    async guardarActivo(userId, a) {
      const fila: Fila = { user_id: userId, tipo: a.tipo, nombre: a.nombre, valor: a.valor, detalle: a.detalle ?? {}, account_id: a.cuentaId ?? null };
      if (a.id) fila.id = a.id;
      const { data, error } = await cli().from('assets').upsert(fila).select('*').single();
      lanzar('guardarActivo', error);
      return aActivo(data);
    },
    async eliminarActivo(userId, id) {
      const { error } = await cli().from('assets').delete().eq('user_id', userId).eq('id', id);
      lanzar('eliminarActivo', error);
    },
    async pasivos(userId) {
      const { data, error } = await cli().from('liabilities').select('*').eq('user_id', userId).order('saldo', { ascending: false });
      lanzar('pasivos', error);
      return (data ?? []).map(aPasivo);
    },
    async guardarPasivo(userId, p) {
      const fila: Fila = { user_id: userId, tipo: p.tipo, nombre: p.nombre, saldo: p.saldo, tasa: p.tasa ?? null, account_id: p.cuentaId ?? null };
      if (p.id) fila.id = p.id;
      const { data, error } = await cli().from('liabilities').upsert(fila).select('*').single();
      lanzar('guardarPasivo', error);
      return aPasivo(data);
    },
    async eliminarPasivo(userId, id) {
      const { error } = await cli().from('liabilities').delete().eq('user_id', userId).eq('id', id);
      lanzar('eliminarPasivo', error);
    },
    async objetivos(userId) {
      const { data, error } = await cli().from('goals').select('*').eq('user_id', userId).order('created_at');
      lanzar('objetivos', error);
      return (data ?? []).map(aObjetivo);
    },
    async guardarObjetivo(userId, o) {
      const fila: Fila = { user_id: userId, grupo: o.grupo, nombre: o.nombre, meta: o.meta, avance: o.avance, fecha: o.fecha ?? null, account_id: o.cuentaId ?? null, completado: o.completado };
      if (o.id) fila.id = o.id;
      const { data, error } = await cli().from('goals').upsert(fila).select('*').single();
      lanzar('guardarObjetivo', error);
      return aObjetivo(data);
    },
    async eliminarObjetivo(userId, id) {
      const { error } = await cli().from('goals').delete().eq('user_id', userId).eq('id', id);
      lanzar('eliminarObjetivo', error);
    },

    async insights(userId) {
      const { data, error } = await cli().from('insights').select('*').eq('user_id', userId).eq('descartado', false).order('created_at', { ascending: false }).limit(100);
      lanzar('insights', error);
      return (data ?? []).map(aInsight);
    },
    async guardarInsights(userId, lista) {
      if (!lista.length) return [];
      const { data: existentes, error: e0 } = await cli().from('insights').select('referencia').eq('user_id', userId);
      lanzar('guardarInsights.existentes', e0);
      const claves = new Set((existentes ?? []).map((f: Fila) => String((f.referencia as Fila)?.clave ?? '')));
      const nuevos = lista.filter((n) => !claves.has(n.clave));
      if (!nuevos.length) return [];
      const { data, error } = await cli()
        .from('insights')
        .insert(nuevos.map((n) => ({ user_id: userId, tipo: n.tipo, titulo: n.titulo, texto: n.texto, monto: n.monto ?? null, cta_label: n.ctaLabel ?? null, cta_href: n.ctaHref ?? null, referencia: { ...n.referencia, clave: n.clave } })))
        .select('*');
      lanzar('guardarInsights', error);
      return (data ?? []).map(aInsight);
    },
    async marcarInsight(userId, id, c) {
      const { error } = await cli().from('insights').update(c).eq('user_id', userId).eq('id', id);
      lanzar('marcarInsight', error);
    },

    async eventos(userId, desde, hasta) {
      const { data, error } = await cli().from('calendar_events').select('*').eq('user_id', userId).gte('fecha', desde).lte('fecha', hasta).order('fecha');
      lanzar('eventos', error);
      return (data ?? []).map(aEvento);
    },
    async guardarEvento(userId, ev) {
      const fila: Fila = { user_id: userId, fecha: ev.fecha, nombre: ev.nombre, monto: ev.monto ?? null, tipo: ev.tipo, recurrent_id: ev.recurrenteId ?? null };
      if (ev.id) fila.id = ev.id;
      const { data, error } = await cli().from('calendar_events').upsert(fila).select('*').single();
      lanzar('guardarEvento', error);
      return aEvento(data);
    },
    async eliminarEvento(userId, id) {
      const { error } = await cli().from('calendar_events').delete().eq('user_id', userId).eq('id', id);
      lanzar('eliminarEvento', error);
    },

    async credencial(userId, proveedor) {
      const { data, error } = await cli().from('credentials').select('*').eq('user_id', userId).eq('proveedor', proveedor).maybeSingle();
      lanzar('credencial', error);
      if (!data) return null;
      return { proveedor, etiqueta: str(data.etiqueta), datos: JSON.parse(descifrar(String(data.datos))) as Record<string, unknown>, updatedAt: String(data.updated_at) };
    },
    async guardarCredencial(userId, c) {
      const { error } = await cli().from('credentials').upsert({ user_id: userId, proveedor: c.proveedor, etiqueta: c.etiqueta ?? null, datos: cifrar(JSON.stringify(c.datos)), updated_at: new Date().toISOString() }, { onConflict: 'user_id,proveedor' });
      lanzar('guardarCredencial', error);
    },
    async eliminarCredencial(userId, proveedor) {
      const { error } = await cli().from('credentials').delete().eq('user_id', userId).eq('proveedor', proveedor);
      lanzar('eliminarCredencial', error);
    },
    async registrarEvento(userId, nombre, props = {}) {
      const { error } = await cli().from('events').insert({ user_id: userId, nombre, props });
      if (error) console.warn('registrarEvento', error.message);
    },

    async importaciones(userId, filtro = {}) {
      let q = cli().from('statement_imports').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50);
      if (filtro.estados?.length) q = q.in('estado', filtro.estados);
      const { data, error } = await q;
      lanzar('importaciones', error);
      return (data ?? []).map(aImportacion);
    },
    async importacion(userId, id) {
      const { data, error } = await cli().from('statement_imports').select('*').eq('user_id', userId).eq('id', id).maybeSingle();
      lanzar('importacion', error);
      return data ? aImportacion(data) : null;
    },
    async importacionPorHash(userId, archivoHash) {
      const { data, error } = await cli().from('statement_imports').select('*').eq('user_id', userId).eq('archivo_hash', archivoHash).maybeSingle();
      lanzar('importacionPorHash', error);
      return data ? aImportacion(data) : null;
    },
    async guardarImportacion(userId, imp) {
      const fila: Fila = deImportacion(userId, imp);
      if (imp.id) fila.id = imp.id;
      const q = imp.id ? cli().from('statement_imports').upsert(fila) : cli().from('statement_imports').upsert(fila, { onConflict: 'user_id,archivo_hash' });
      const { data, error } = await q.select('*').single();
      lanzar('guardarImportacion', error);
      return aImportacion(data);
    },
    async eliminarImportacion(userId, id) {
      const { error } = await cli().from('statement_imports').delete().eq('user_id', userId).eq('id', id);
      lanzar('eliminarImportacion', error);
    },
    async registrarDescriptoresSinCategoria(userId, lista) {
      if (!lista.length) return;
      const { data: existentes } = await cli().from('unmatched_descriptors').select('descriptor, veces').eq('user_id', userId).in('descriptor', lista.map((d) => d.descriptor));
      const veces = new Map((existentes ?? []).map((f: Fila) => [String(f.descriptor), Number(f.veces)]));
      const filas = lista.map((d) => ({ user_id: userId, descriptor: d.descriptor, veces: (veces.get(d.descriptor) ?? 0) + 1, comercio_llm: d.comercioLlm ?? null, categoria_llm: d.categoriaLlm ?? null }));
      const { error } = await cli().from('unmatched_descriptors').upsert(filas, { onConflict: 'user_id,descriptor' });
      if (error) console.warn('registrarDescriptoresSinCategoria', error.message);
    },

    async registrarEstadoDeCuenta(userId, s) {
      const { data, error } = await cli().from('statements').insert({ user_id: userId, account_id: s.cuentaId ?? null, archivo: s.archivo, banco: s.banco ?? null, estado: s.estado, transacciones: s.transacciones, error: s.error ?? null }).select('id').single();
      lanzar('registrarEstadoDeCuenta', error);
      return { id: String(data!.id) };
    },
  };
}

/** Repo con la sesión del usuario actual (cookies). */
export const repoSupabase: Repo = repoSupabaseCon(() => supabaseServer());
