// Insights por reglas (v1). Sin IA: cada regla es explicable y verificable con los datos.

import { deISO, diasEntre, sumarDias, aISO } from './fechas';
import { costoMensual, proximoCobro } from './recurrentes';
import { enRango, type Rango } from './quincena';
import type { Insight, Movimiento, Recurrente } from './tipos';

export type InsightCandidato = Omit<Insight, 'id' | 'leido' | 'descartado' | 'createdAt'> & { clave: string };

export function generarInsights(args: { movs: Movimiento[]; recurrentes: Recurrente[]; rango: Rango; ingresoPeriodo: number; excedente: number; hoy?: Date }): InsightCandidato[] {
  const { movs, recurrentes, rango, ingresoPeriodo, excedente } = args;
  const hoy = args.hoy ?? new Date();
  const out: InsightCandidato[] = [];

  // 1. Suscripción nueva (primer cargo en los últimos 35 días)
  for (const r of recurrentes.filter((x) => x.activo && x.tipo === 'suscripcion' && x.veces === 1 && x.ultimoCargo)) {
    if (diasEntre(deISO(r.ultimoCargo!), hoy) <= 35) {
      out.push({
        clave: `sus-nueva:${r.id}`,
        tipo: 'suscripcion_nueva',
        titulo: `Suscripción nueva: ${r.nombre}`,
        texto: `Detectamos un cargo de ${fmt(r.monto)} de ${r.nombre} (${fmt(costoMensual(r) * 12)} al año). Si no la reconoces o no la quieres, cancélala antes del siguiente cobro.`,
        monto: costoMensual(r),
        ctaLabel: 'Ver suscripción',
        ctaHref: `/app/fijos?r=${r.id}`,
        referencia: { recurrenteId: r.id },
      });
    }
  }

  // 2. Suscripciones que llevan ≥ 3 meses: cuánto suman al año
  const viejas = recurrentes.filter((x) => x.activo && x.tipo === 'suscripcion' && x.veces >= 3);
  if (viejas.length >= 2) {
    const mensual = viejas.reduce((s, r) => s + costoMensual(r), 0);
    out.push({
      clave: 'sus-total',
      tipo: 'suscripciones_total',
      titulo: `${viejas.length} suscripciones suman ${fmt(mensual)} al mes`,
      texto: `Son ${fmt(mensual * 12)} al año. Llevas al menos 3 meses pagando ${viejas.map((r) => r.nombre).slice(0, 4).join(', ')}${viejas.length > 4 ? ' y más' : ''}. Revisa cuáles sigues usando.`,
      monto: mensual,
      ctaLabel: 'Revisar suscripciones',
      ctaHref: '/app/fijos',
      referencia: { ids: viejas.map((r) => r.id) },
    });
  }

  // 3. MSI que termina en los próximos 45 días → libera dinero
  for (const r of recurrentes.filter((x) => x.activo && x.tipo === 'msi' && x.msiTermina)) {
    const dias = diasEntre(hoy, deISO(r.msiTermina!));
    if (dias >= 0 && dias <= 45) {
      out.push({
        clave: `msi-termina:${r.id}`,
        tipo: 'msi_termina',
        titulo: `${r.nombre} termina ${dias <= 7 ? 'esta semana' : 'pronto'}`,
        texto: `Tu última cuota de ${fmt(r.monto)} es en ${dias} días. A partir de entonces liberas ${fmt(r.monto)} al mes.`,
        monto: r.monto,
        ctaLabel: 'Ver meses sin intereses',
        ctaHref: '/app/fijos?sec=msi',
        referencia: { recurrenteId: r.id },
      });
    }
  }

  // 4. Total de MSI activos
  const msi = recurrentes.filter((x) => x.activo && x.tipo === 'msi');
  if (msi.length) {
    const mensual = msi.reduce((s, r) => s + r.monto, 0);
    out.push({
      clave: 'msi-total',
      tipo: 'msi_total',
      titulo: `${msi.length === 1 ? '1 compra a meses' : `${msi.length} compras a meses`}: ${fmt(mensual)} al mes`,
      texto: `Antes de una compra nueva a meses, recuerda que ya tienes comprometidos ${fmt(mensual)} mensuales hasta ${fechaLarga(msi.map((r) => r.msiTermina!).sort().pop()!)}.`,
      monto: mensual,
      ctaLabel: 'Ver detalle',
      ctaHref: '/app/fijos?sec=msi',
      referencia: { ids: msi.map((r) => r.id) },
    });
  }

  // 5. Cargo duplicado: mismo comercio, mismo monto, mismo día
  const gastos = movs.filter((m) => m.tipo === 'gasto' && enRango(m.fecha, rango));
  const vistos = new Map<string, Movimiento>();
  for (const m of gastos) {
    const k = `${m.comercio}|${m.fecha}|${Math.round(m.monto * 100)}`;
    const prev = vistos.get(k);
    if (prev && !m.esMsi) {
      out.push({
        clave: `dup:${prev.id}:${m.id}`,
        tipo: 'cargo_duplicado',
        titulo: `Cargo duplicado en ${m.comercio}`,
        texto: `Hay dos cargos de ${fmt(m.monto)} de ${m.comercio} el ${fechaLarga(m.fecha)}. Si solo compraste una vez, reclama al banco.`,
        monto: m.monto,
        ctaLabel: 'Ver movimientos',
        ctaHref: `/app/gastos?q=${encodeURIComponent(m.comercio)}`,
        referencia: { movimientoIds: [prev.id, m.id] },
      });
    } else vistos.set(k, m);
  }

  // 6. Comisiones e intereses del periodo
  const comisiones = gastos.filter((m) => m.categoriaId === 'comisiones');
  if (comisiones.length) {
    const total = comisiones.reduce((s, m) => s + m.monto, 0);
    out.push({
      clave: `comisiones:${rango.inicio}`,
      tipo: 'comisiones',
      titulo: `Pagaste ${fmt(total)} en comisiones e intereses`,
      texto: comisiones.some((m) => /anualidad/i.test(m.comercio))
        ? 'Incluye una anualidad. Muchos bancos la condonan si la pides por antigüedad o por gasto: vale una llamada.'
        : 'Pagar el total de la tarjeta antes de la fecha límite evita intereses. Revisa qué tarjeta los generó.',
      monto: total,
      ctaLabel: 'Ver cargos',
      ctaHref: '/app/gastos?cat=comisiones',
      referencia: { movimientoIds: comisiones.map((m) => m.id) },
    });
  }

  // 7. Próximos cobros en 7 días
  const proximos = recurrentes
    .filter((x) => x.activo)
    .map((r) => ({ r, f: proximoCobro(r, hoy) }))
    .filter(({ f }) => diasEntre(hoy, f) >= 0 && diasEntre(hoy, f) <= 7);
  if (proximos.length) {
    const total = proximos.reduce((s, { r }) => s + r.monto, 0);
    out.push({
      clave: `prox:${aISO(hoy)}`,
      tipo: 'proximos_cobros',
      titulo: `${proximos.length === 1 ? '1 cobro esta semana' : `${proximos.length} cobros esta semana`}: ${fmt(total)}`,
      texto: proximos
        .sort((a, b) => a.f.getTime() - b.f.getTime())
        .slice(0, 4)
        .map(({ r, f }) => `${r.nombre} ${fmt(r.monto)} el ${f.getDate()}`)
        .join(' · '),
      monto: total,
      ctaLabel: 'Ver calendario',
      ctaHref: '/app/fijos?vista=cal',
      referencia: { ids: proximos.map(({ r }) => r.id) },
    });
  }

  // 8. Puedes invertir
  if (excedente > 0 && ingresoPeriodo > 0) {
    out.push({
      clave: `invertir:${rango.inicio}`,
      tipo: 'puedes_invertir',
      titulo: `Puedes invertir ${fmt(excedente)} esta quincena`,
      texto: `Después de fijos, meses sin intereses y tu gasto habitual, te sobran ${fmt(excedente)}. En CETES a ~10 % anual serían ${fmt(excedente * 1.1)} en un año.`,
      monto: excedente,
      ctaLabel: 'Ver inversiones',
      ctaHref: '/app/inversiones',
      referencia: {},
    });
  }

  return out;
}

function fmt(n: number) {
  return `$${Math.round(n).toLocaleString('es-MX')}`;
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
function fechaLarga(iso: string) {
  const d = deISO(iso);
  return `${d.getDate()} de ${MESES[d.getMonth()]}`;
}

export { sumarDias };
