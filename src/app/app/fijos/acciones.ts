'use server';

import { hoyMX } from '@/lib/domain/fechas';
import { revalidatePath } from 'next/cache';
import { contexto } from '@/lib/data/contexto';
import type { Frecuencia, TipoRecurrente } from '@/lib/domain/tipos';
import { COMERCIOS } from '@/lib/domain/comercios';
import { normalizar } from '@/lib/domain/categorizar';
import { registrar } from '@/lib/services/analytics';
import { aISO, sumarDias } from '@/lib/domain/fechas';
import { costoMensual } from '@/lib/domain/recurrentes';
import { cartaNegociacion, guionNegociacion, resultadoNegociacion } from '@/lib/domain/carta';
import { generarCartaPdf, generarPdfCarta } from '@/lib/services/carta';
import { enviarCorreo } from '@/lib/services/correo';

type R = { ok: true; id?: string } | { ok: false; error: string };

function revalidar() {
  for (const p of ['/app', '/app/fijos', '/app/presupuesto', '/app/insights']) revalidatePath(p);
}

export async function crearRecurrente(datos: { nombre: string; monto: number; diaCobro: number; tipo: TipoRecurrente; frecuencia?: Frecuencia; cuentaId?: string | null; msiCuotasTotal?: number | null; msiCuotasPagadas?: number | null }): Promise<R> {
  const { usuario, repo } = await contexto();
  if (!datos.nombre.trim() || !(datos.monto > 0) || !(datos.diaCobro >= 1 && datos.diaCobro <= 31)) return { ok: false, error: 'Revisa nombre, monto y día de cobro.' };
  const n = normalizar(datos.nombre);
  const conocido = COMERCIOS.find((c) => n.includes(c.patron));
  const hoy = hoyMX();
  const restantes = datos.tipo === 'msi' && datos.msiCuotasTotal ? Math.max(0, datos.msiCuotasTotal - (datos.msiCuotasPagadas ?? 0)) : 0;
  const termina = new Date(hoy.getFullYear(), hoy.getMonth() + restantes, datos.diaCobro);
  const r = await repo.guardarRecurrente(usuario.id, {
    nombre: datos.nombre.trim(),
    comercioDominio: conocido?.dominio ?? null,
    tipo: datos.tipo,
    monto: datos.monto,
    diaCobro: datos.diaCobro,
    frecuencia: datos.frecuencia ?? 'mensual',
    veces: datos.msiCuotasPagadas ?? 1,
    activo: true,
    cuentaId: datos.cuentaId ?? null,
    msiCuotasTotal: datos.tipo === 'msi' ? datos.msiCuotasTotal ?? null : null,
    msiCuotasPagadas: datos.tipo === 'msi' ? datos.msiCuotasPagadas ?? null : null,
    msiTermina: datos.tipo === 'msi' ? termina.toISOString().slice(0, 10) : null,
    categoriaId: datos.tipo === 'msi' ? 'msi' : datos.tipo === 'suscripcion' ? 'suscripciones' : datos.tipo === 'colegiatura' ? 'colegiaturas' : datos.tipo === 'servicio' ? 'servicios' : 'fijos',
    origen: 'manual',
  });
  revalidar();
  return { ok: true, id: r.id };
}

/** El usuario ya canceló por su cuenta (cancelación guiada): la marcamos y dejamos de contarla. */
export async function marcarCancelada(recurrenteId: string): Promise<R> {
  const { usuario, repo } = await contexto();
  const r = (await repo.recurrentes(usuario.id)).find((x) => x.id === recurrenteId);
  if (!r) return { ok: false, error: 'No encontramos la suscripción.' };
  await repo.guardarRecurrente(usuario.id, { ...r, activo: false, canceladoAt: new Date().toISOString() });
  await registrar(repo, usuario.id, 'suscripcion_cancelada', { recurrenteId, mensual: r.monto });
  revalidar();
  return { ok: true };
}

export type DatosCancelacion = { nombre: string; correo: string; ultimos4?: string | null; correoProveedor?: string | null };
export type ResultadoSolicitud = { ok: true; id: string; enviadoA: 'proveedor' | 'usuario' | null; seguimiento: string } | { ok: false; error: string };

/**
 * "Cancelar por mí", sin humanos: genera la carta, la manda por correo (al proveedor con copia al usuario si hay
 * correo del proveedor; si no, al usuario para que la reenvíe) y agenda el seguimiento a 10 días. Sin Resend, la
 * carta queda para descargar y el seguimiento se agenda igual.
 */
export async function solicitarCancelacion(recurrenteId: string, notas?: string, datos?: DatosCancelacion): Promise<ResultadoSolicitud> {
  const { usuario, repo, perfil } = await contexto();
  const r = (await repo.recurrentes(usuario.id)).find((x) => x.id === recurrenteId);
  if (!r) return { ok: false, error: 'No encontramos la suscripción.' };
  const hoy = hoyMX();
  const seguimiento = aISO(sumarDias(hoy, 10));
  const titular = datos?.nombre?.trim() || perfil.nombre?.trim() || usuario.nombre;
  const correoUsuario = datos?.correo?.trim() || usuario.email;
  const proveedor = datos?.correoProveedor?.trim() || null;
  const pdf = await generarCartaPdf({ servicio: r.nombre, titular, correo: correoUsuario, ultimos4: datos?.ultimos4 ?? null, montoMensual: r.tipo === 'msi' ? r.monto : costoMensual(r), fecha: aISO(hoy), notas: notas ?? null });
  const adjunto = { nombre: `cancelacion-${r.nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`, contenido: pdf };
  let enviadoA: 'proveedor' | 'usuario' | null = null;
  if (proveedor && correoUsuario) {
    const env = await enviarCorreo({ para: proveedor, cc: correoUsuario, responderA: correoUsuario, asunto: `Solicitud de cancelación de ${r.nombre}`, texto: `Adjunto mi solicitud formal de cancelación del servicio ${r.nombre}. Solicito confirmación por escrito a este correo en un plazo no mayor a diez días hábiles.\n\n${titular}`, adjuntos: [adjunto] });
    if (env.ok) enviadoA = 'proveedor';
  }
  if (!enviadoA && correoUsuario) {
    const env = await enviarCorreo({ para: correoUsuario, asunto: `Tu carta para cancelar ${r.nombre}`, texto: `Aquí va tu carta de cancelación de ${r.nombre} lista para enviar. Reenvíala al correo o chat de atención del servicio y guarda su respuesta. El ${seguimiento} te preguntamos si ya se confirmó.\n\nMoneyMaker`, adjuntos: [adjunto] });
    if (env.ok) enviadoA = 'usuario';
  }
  const t = await repo.crearSolicitudCancelacion(usuario.id, recurrenteId, notas, { tipo: 'cancelacion', enviadoA: enviadoA === 'proveedor' ? proveedor : enviadoA === 'usuario' ? correoUsuario : null, seguimiento });
  await repo.guardarEvento(usuario.id, { fecha: seguimiento, nombre: `Confirmar que ${r.nombre} ya no cobra`, monto: null, tipo: 'recordatorio', recurrenteId: r.id });
  await registrar(repo, usuario.id, 'cancelar_por_mi', { recurrenteId, nombre: r.nombre, enviadoA });
  revalidar();
  return { ok: true, id: t.id, enviadoA, seguimiento };
}

export type DatosNegociar = { precioActual: number; ofertaProveedor?: string | null; ofertaPrecio?: number | null; correoProveedor?: string | null; numeroCuenta?: string | null; nombre?: string | null };

/** "Negociar mi tarifa": carta + guion por correo (al proveedor con copia, o al usuario) y solicitud tipo negociación. */
export async function solicitarNegociacion(recurrenteId: string, datos: DatosNegociar): Promise<ResultadoSolicitud & { guion?: string[] }> {
  const { usuario, repo, perfil } = await contexto();
  const r = (await repo.recurrentes(usuario.id)).find((x) => x.id === recurrenteId);
  if (!r) return { ok: false, error: 'No encontramos el servicio.' };
  if (!(datos.precioActual > 0)) return { ok: false, error: 'Escribe cuánto pagas hoy.' };
  const hoy = hoyMX();
  const seguimiento = aISO(sumarDias(hoy, 10));
  const titular = datos.nombre?.trim() || perfil.nombre?.trim() || usuario.nombre;
  const oferta = datos.ofertaProveedor?.trim() && datos.ofertaPrecio && datos.ofertaPrecio > 0 ? { proveedor: datos.ofertaProveedor.trim(), precio: datos.ofertaPrecio } : null;
  const base = { servicio: r.nombre, titular, correo: usuario.email || null, numeroCuenta: datos.numeroCuenta?.trim() || null, precioActual: datos.precioActual, ofertaCompetencia: oferta, antiguedadMeses: r.veces || null, fecha: aISO(hoy) };
  const guion = guionNegociacion(base);
  const pdf = await generarPdfCarta(cartaNegociacion(base));
  const adjunto = { nombre: `negociacion-${r.nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`, contenido: pdf };
  const proveedor = datos.correoProveedor?.trim() || null;
  let enviadoA: 'proveedor' | 'usuario' | null = null;
  if (proveedor && usuario.email) {
    const env = await enviarCorreo({ para: proveedor, cc: usuario.email, responderA: usuario.email, asunto: `Solicitud de mejor tarifa: ${r.nombre}`, texto: `Adjunto mi solicitud para revisar la tarifa de ${r.nombre}. Pido respuesta por escrito en un plazo no mayor a diez días hábiles.\n\n${titular}`, adjuntos: [adjunto] });
    if (env.ok) enviadoA = 'proveedor';
  }
  if (!enviadoA && usuario.email) {
    const env = await enviarCorreo({ para: usuario.email, asunto: `Tu carta y guion para negociar ${r.nombre}`, texto: `Carta adjunta y guion para la llamada o el chat:\n\n${guion.map((g, i) => `${i + 1}. ${g}`).join('\n')}\n\nCuando te den el nuevo precio, anótalo en MoneyMaker para ver tu ahorro.`, adjuntos: [adjunto] });
    if (env.ok) enviadoA = 'usuario';
  }
  const t = await repo.crearSolicitudCancelacion(usuario.id, recurrenteId, oferta ? `Oferta: ${oferta.proveedor} ${oferta.precio}` : undefined, { tipo: 'negociacion', enviadoA: enviadoA === 'proveedor' ? proveedor : enviadoA === 'usuario' ? usuario.email : null, seguimiento, precioActual: datos.precioActual });
  await repo.guardarEvento(usuario.id, { fecha: seguimiento, nombre: `¿${r.nombre} ya respondió a tu tarifa?`, monto: null, tipo: 'recordatorio', recurrenteId: r.id });
  await registrar(repo, usuario.id, 'negociar_por_mi', { recurrenteId, nombre: r.nombre, enviadoA });
  revalidar();
  return { ok: true, id: t.id, enviadoA, seguimiento, guion };
}

/** El usuario anota el nuevo precio: ahorro anual y comisión del 25 % sobre el ahorro del primer año. */
export async function registrarNegociacion(solicitudId: string, recurrenteId: string, precioActual: number, nuevoPrecio: number): Promise<{ ok: true; ahorroAnual: number; comision: number } | { ok: false; error: string }> {
  const { usuario, repo } = await contexto();
  if (!(nuevoPrecio >= 0) || !(precioActual > 0)) return { ok: false, error: 'Escribe el nuevo precio.' };
  const res = resultadoNegociacion(precioActual, nuevoPrecio);
  await repo.actualizarSolicitud(usuario.id, solicitudId, { estado: res.ahorroAnual > 0 ? 'cancelada' : 'no_posible', nuevoPrecio, ahorroAnual: res.ahorroAnual, comision: res.comision });
  const r = (await repo.recurrentes(usuario.id)).find((x) => x.id === recurrenteId);
  if (r && nuevoPrecio > 0 && nuevoPrecio !== r.monto) await repo.guardarRecurrente(usuario.id, { ...r, monto: nuevoPrecio, origen: 'manual' });
  await registrar(repo, usuario.id, 'negociacion_resultado', { recurrenteId, ahorroAnual: res.ahorroAnual, comision: res.comision });
  revalidar();
  return { ok: true, ...res };
}

export async function eliminarRecurrente(recurrenteId: string): Promise<R> {
  const { usuario, repo } = await contexto();
  await repo.eliminarRecurrente(usuario.id, recurrenteId);
  revalidar();
  return { ok: true };
}

export async function crearEvento(datos: { fecha: string; nombre: string; monto?: number | null; tipo: 'cargo' | 'recordatorio' | 'pago'; recurrenteId?: string | null }): Promise<R> {
  const { usuario, repo } = await contexto();
  if (!datos.nombre.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(datos.fecha)) return { ok: false, error: 'Escribe un nombre y una fecha.' };
  const e = await repo.guardarEvento(usuario.id, { fecha: datos.fecha, nombre: datos.nombre.trim(), monto: datos.monto ?? null, tipo: datos.tipo, recurrenteId: datos.recurrenteId ?? null });
  revalidar();
  return { ok: true, id: e.id };
}

export async function eliminarEvento(id: string): Promise<R> {
  const { usuario, repo } = await contexto();
  await repo.eliminarEvento(usuario.id, id);
  revalidar();
  return { ok: true };
}

/** "No es recurrente": se desactiva y el detector no lo vuelve a crear (queda marcado como ignorado). */
export async function marcarNoRecurrente(recurrenteId: string): Promise<R> {
  const { usuario, repo } = await contexto();
  const r = (await repo.recurrentes(usuario.id)).find((x) => x.id === recurrenteId);
  if (!r) return { ok: false, error: 'No encontramos el cargo.' };
  await repo.guardarRecurrente(usuario.id, { ...r, activo: false, ignorado: true });
  for (const m of (await repo.movimientos(usuario.id)).filter((x) => x.recurrenteId === r.id)) await repo.actualizarMovimiento(usuario.id, m.id, { recurrenteId: null });
  revalidar();
  return { ok: true };
}
