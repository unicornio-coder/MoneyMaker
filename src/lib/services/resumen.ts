// Resumen del domingo: arma el correo (texto y HTML) a partir del resumen puro y lo manda con Resend.
// Colores de la paleta (verde #16A34A, tinta #0B1F17, azul #2563EB para gasto). Nunca rojo.

import type { Repo } from '@/lib/data/repo';
import type { Perfil } from '@/lib/domain/tipos';
import { resumenSemanal, type ResumenSemanal } from '@/lib/domain/resumen';
import { categoria } from '@/lib/domain/categorias';
import { formatMXN, fechaCorta } from '@/lib/format';
import { enviarCorreo, type ResultadoCorreo } from './correo';

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c);
}

export function asuntoResumen(r: ResumenSemanal): string {
  return r.movimientos ? `Tu semana: gastaste ${formatMXN(r.gasto)}` : 'Tu semana en MoneyMaker';
}

export function textoResumen(r: ResumenSemanal, nombre: string | null, urlApp: string): string {
  const l: string[] = [];
  l.push(`Hola${nombre ? ` ${nombre}` : ''}. Así fue tu semana del ${fechaCorta(r.desde)} al ${fechaCorta(r.hasta)}.`);
  l.push('');
  l.push(`Gasto de la semana: ${formatMXN(r.gasto)} en ${r.movimientos} movimientos.`);
  if (r.variacion !== null) l.push(r.variacion === 0 ? 'Igual que la semana pasada.' : r.variacion > 0 ? `${r.variacion} % más que la semana pasada (${formatMXN(r.gastoAnterior)}).` : `${Math.abs(r.variacion)} % menos que la semana pasada (${formatMXN(r.gastoAnterior)}).`);
  if (r.topCategorias.length) l.push(`En qué se fue: ${r.topCategorias.map((c) => `${categoria(c.categoriaId).nombre} ${formatMXN(c.monto)}`).join(' · ')}.`);
  if (r.mayorGasto) l.push(`Tu mayor gasto: ${r.mayorGasto.comercio}, ${formatMXN(r.mayorGasto.monto)} el ${fechaCorta(r.mayorGasto.fecha)}.`);
  l.push('');
  if (r.proximos.lista.length) {
    l.push(`Próximos 7 días: ${formatMXN(r.proximos.total)} en cobros fijos.`);
    for (const c of r.proximos.lista) l.push(`- ${fechaCorta(c.fecha)} · ${c.recurrente.nombre} · ${formatMXN(c.monto)}`);
  } else l.push('Próximos 7 días: sin cobros fijos programados.');
  if (r.suscripcionesNuevas.length) {
    l.push('');
    l.push(`Suscripciones nuevas: ${r.suscripcionesNuevas.map((s) => `${s.nombre} (${formatMXN(s.monto)} al mes)`).join(', ')}. Si no las reconoces, cancélalas desde Gastos fijos.`);
  }
  l.push('');
  l.push(`Ver mi panel: ${urlApp}/app`);
  l.push(`Dejar de recibir este resumen: ${urlApp}/app/ajustes?sec=notificaciones`);
  return l.join('\n');
}

export function htmlResumen(r: ResumenSemanal, nombre: string | null, urlApp: string): string {
  const fila = (k: string, v: string) => `<tr><td style="padding:6px 0;color:#5f6b67;font-size:13px">${esc(k)}</td><td style="padding:6px 0;text-align:right;font-weight:600;font-size:13px;color:#0B1F17">${esc(v)}</td></tr>`;
  const variacion = r.variacion === null ? '' : r.variacion === 0 ? 'Igual que la semana pasada.' : r.variacion > 0 ? `${r.variacion} % más que la semana pasada.` : `${Math.abs(r.variacion)} % menos que la semana pasada.`;
  const proximos = r.proximos.lista.length ? r.proximos.lista.map((c) => fila(`${fechaCorta(c.fecha)} · ${c.recurrente.nombre}`, formatMXN(c.monto))).join('') : `<tr><td style="padding:6px 0;color:#5f6b67;font-size:13px">Sin cobros fijos programados.</td></tr>`;
  const nuevas = r.suscripcionesNuevas.length ? `<p style="margin:18px 0 0;font-size:13px;color:#0B1F17"><b>Suscripciones nuevas:</b> ${esc(r.suscripcionesNuevas.map((s) => `${s.nombre} (${formatMXN(s.monto)} al mes)`).join(', '))}. Si no las reconoces, cancélalas desde Gastos fijos.</p>` : '';
  return `<!doctype html><html lang="es"><body style="margin:0;background:#F7F8F7;font-family:Inter,Helvetica,Arial,sans-serif;color:#0B1F17">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#fff;border-radius:18px;padding:28px">
<tr><td>
<div style="font-size:12px;font-weight:700;letter-spacing:.9px;text-transform:uppercase;color:#16A34A">MoneyMaker · Tu semana</div>
<h1 style="margin:8px 0 0;font-size:22px;line-height:1.2">Hola${nombre ? ` ${esc(nombre)}` : ''}. Del ${esc(fechaCorta(r.desde))} al ${esc(fechaCorta(r.hasta))}.</h1>
<div style="margin-top:18px;font-size:12px;color:#5f6b67">Gasto de la semana</div>
<div style="font-size:36px;font-weight:800;letter-spacing:-1px;color:#2563EB">${esc(formatMXN(r.gasto))}</div>
<div style="font-size:13px;color:#5f6b67">${r.movimientos} movimientos. ${esc(variacion)}</div>
${r.topCategorias.length ? `<table role="presentation" width="100%" style="margin-top:18px;border-top:1px solid #E3E7E4">${r.topCategorias.map((c) => fila(categoria(c.categoriaId).nombre, formatMXN(c.monto))).join('')}</table>` : ''}
${r.mayorGasto ? `<p style="margin:14px 0 0;font-size:13px">Tu mayor gasto: <b>${esc(r.mayorGasto.comercio)}</b>, ${esc(formatMXN(r.mayorGasto.monto))} el ${esc(fechaCorta(r.mayorGasto.fecha))}.</p>` : ''}
<div style="margin-top:22px;font-size:12px;font-weight:700;letter-spacing:.9px;text-transform:uppercase;color:#16A34A">Próximos 7 días · ${esc(formatMXN(r.proximos.total))}</div>
<table role="presentation" width="100%" style="margin-top:6px">${proximos}</table>
${nuevas}
<a href="${esc(urlApp)}/app" style="display:block;margin-top:24px;background:#0B1F17;color:#fff;text-decoration:none;text-align:center;border-radius:11px;padding:14px;font-weight:700;font-size:15px">Ver mi panel</a>
<p style="margin:18px 0 0;font-size:11px;color:#5f6b67">Recibes este correo cada domingo. <a href="${esc(urlApp)}/app/ajustes?sec=notificaciones" style="color:#16A34A">Cambiar avisos</a></p>
</td></tr></table></td></tr></table></body></html>`;
}

/** Arma y manda el resumen de un usuario. Devuelve `ok:false` con `sin_datos` si no hay nada que contar. */
export async function enviarResumenSemanal(repo: Repo, userId: string, perfil: Perfil, hoy: Date, urlApp: string): Promise<ResultadoCorreo | { ok: false; error: 'sin_datos' }> {
  const [movs, recs] = await Promise.all([repo.movimientos(userId, { limite: 2000 }), repo.recurrentes(userId)]);
  const r = resumenSemanal(movs, recs, hoy);
  if (!r.movimientos && !r.proximos.lista.length) return { ok: false, error: 'sin_datos' };
  const nombre = perfil.nombre?.split(' ')[0] ?? null;
  return enviarCorreo({ para: perfil.email, asunto: asuntoResumen(r), texto: textoResumen(r, nombre, urlApp), html: htmlResumen(r, nombre, urlApp) });
}
