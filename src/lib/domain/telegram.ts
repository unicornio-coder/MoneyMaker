// Bot de Telegram "¿Cuánto me queda?": lógica pura, con test. Aquí se decide qué cifras puede decir el bot y se
// revisa que la redacción del modelo no traiga ninguna cifra que la app no haya calculado.

import { aISO } from './fechas';
import { cobrosProximos, costoMensual } from './recurrentes';
import { proximoDiaDePago, type Rango } from './quincena';
import type { Recurrente } from './tipos';

/** Las únicas cifras que el bot puede mencionar. Todas salen de los cálculos que ya usa Presupuesto y Suscripciones. */
export type DatosBot = {
  hayDatos: boolean;
  /** false cuando la quincena en curso no tiene movimientos y las cifras son del último periodo con datos (igual que Presupuesto). */
  periodoActual: boolean;
  periodo: string;
  diasRestantes: number;
  proximoPago: string;
  limite: number;
  gastado: number;
  /** Lo mismo que "Te quedan" en Presupuesto: límite de la quincena menos lo gastado. Negativo si ya se pasó. */
  teQueda: number;
  porDia: number;
  suscripciones: { nombre: string; mensual: number }[];
  totalSuscripciones: number;
  totalSuscripcionesAnual: number;
  proximosCobros: { nombre: string; monto: number; fecha: string }[];
  totalProximosCobros: number;
};

export type Intencion = 'queda' | 'suscripciones' | 'cobros' | 'ayuda';

type VsPresupuesto = { limiteTotal: number; gastado: number; libres: number; porDia: number; diasRestantes: number };

export function armarDatosBot(args: { rango: Rango; periodoActual?: boolean; vs: VsPresupuesto; recurrentes: Recurrente[]; movimientos: number; hoy: Date; diasPago?: number[] }): DatosBot {
  const { rango, vs, recurrentes, hoy } = args;
  const activos = recurrentes.filter((r) => r.activo && !r.canceladoAt && !r.ignorado);
  const suscripciones = activos
    .filter((r) => r.tipo === 'suscripcion')
    .map((r) => ({ nombre: r.nombre, mensual: Math.round(costoMensual(r)) }))
    .sort((a, b) => b.mensual - a.mensual);
  const totalSuscripciones = suscripciones.reduce((s, x) => s + x.mensual, 0);
  const proximos = cobrosProximos(activos, hoy, 7);
  const proximosCobros = proximos.lista.slice(0, 8).map((c) => ({ nombre: c.recurrente.nombre, monto: Math.round(c.monto), fecha: c.fecha }));
  return {
    hayDatos: args.movimientos > 0,
    periodoActual: args.periodoActual ?? true,
    periodo: rango.etiqueta,
    diasRestantes: vs.diasRestantes,
    proximoPago: aISO(proximoDiaDePago(hoy, args.diasPago ?? [5, 20])),
    limite: Math.round(vs.limiteTotal),
    gastado: Math.round(vs.gastado),
    teQueda: Math.round(vs.libres),
    porDia: Math.round(vs.porDia),
    suscripciones,
    totalSuscripciones,
    totalSuscripcionesAnual: totalSuscripciones * 12,
    proximosCobros,
    totalProximosCobros: proximosCobros.reduce((s, c) => s + c.monto, 0),
  };
}

const sinAcentos = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Qué pregunta el usuario. Sirve para la respuesta de respaldo y para las métricas; el modelo recibe la pregunta tal cual. */
export function intencionDe(pregunta: string): Intencion {
  const t = sinAcentos(pregunta);
  if (/suscrip|netflix|spotify|streaming|membres/.test(t)) return 'suscripciones';
  if (/cobro|cobran|vence|proxim|esta semana|me van a cobrar/.test(t)) return 'cobros';
  if (/queda|sobra|alcanza|quincena|puedo gastar|presupuesto|llevo gastado|gastado|gaste/.test(t)) return 'queda';
  return 'ayuda';
}

const dias = (n: number) => (n === 1 ? '1 día' : `${n} días`);

/** Respuesta sin modelo: mismas cifras, redacción fija. Es también el respaldo cuando la redacción del modelo no pasa la revisión. */
export function respuestaDeReglas(intencion: Intencion, d: DatosBot, mxn: (n: number) => string): string {
  if (!d.hayDatos) return 'Todavía no tengo movimientos tuyos. Sube un estado de cuenta en MoneyMaker y vuelve a preguntarme.';
  if (intencion === 'suscripciones') {
    if (!d.suscripciones.length) return 'No encontré suscripciones activas en tus movimientos.';
    const top = d.suscripciones.slice(0, 3).map((s) => `${s.nombre} ${mxn(s.mensual)}`).join(', ');
    return `Pagas ${mxn(d.totalSuscripciones)} al mes en ${d.suscripciones.length === 1 ? '1 suscripción' : `${d.suscripciones.length} suscripciones`}. Las más caras: ${top}.`;
  }
  if (intencion === 'cobros') {
    if (!d.proximosCobros.length) return 'No tienes cobros fijos programados en los próximos 7 días.';
    return `En los próximos 7 días te cobran ${mxn(d.totalProximosCobros)}: ${d.proximosCobros.map((c) => `${c.nombre} ${mxn(c.monto)}`).join(', ')}.`;
  }
  if (intencion === 'ayuda') return 'Puedes preguntarme cuánto te queda de la quincena, cuánto pagas de suscripciones o qué cobros vienen esta semana.';
  if (!d.periodoActual) {
    const cierre = d.limite <= 0 ? `gastaste ${mxn(d.gastado)}` : d.teQueda < 0 ? `te pasaste por ${mxn(-d.teQueda)}: gastaste ${mxn(d.gastado)} de ${mxn(d.limite)}` : `te quedaron ${mxn(d.teQueda)}: gastaste ${mxn(d.gastado)} de ${mxn(d.limite)}`;
    return `No tengo movimientos de tu quincena actual. En tu último periodo con datos (${d.periodo}) ${cierre}. Sube un estado de cuenta más reciente para ver cuánto te queda hoy.`;
  }
  if (d.limite <= 0) return `Llevas ${mxn(d.gastado)} gastados en ${d.periodo} y faltan ${dias(d.diasRestantes)} para que termine. Aún no tienes presupuesto para calcular cuánto te queda.`;
  if (d.teQueda < 0) return `Ya te pasaste por ${mxn(-d.teQueda)}: llevas ${mxn(d.gastado)} de ${mxn(d.limite)} y faltan ${dias(d.diasRestantes)} para que termine tu quincena.`;
  return `Te quedan ${mxn(d.teQueda)} para ${dias(d.diasRestantes)}: llevas ${mxn(d.gastado)} de ${mxn(d.limite)}. Son ${mxn(d.porDia)} por día.`;
}

/** Cantidades en pesos que aparecen en un texto ("$1,250", "$ 980.50", "1,250 pesos"). */
export function cifrasEnTexto(texto: string): number[] {
  const out: number[] = [];
  const re = /\$\s?(\d[\d,]*(?:\.\d+)?)|(\d[\d,]*(?:\.\d+)?)\s*(?:pesos|mxn)\b/gi;
  for (const m of texto.matchAll(re)) {
    const n = Number((m[1] ?? m[2] ?? '').replace(/,/g, ''));
    if (Number.isFinite(n)) out.push(n);
  }
  return out;
}

/** Todas las cantidades que el bot tiene permitido decir para estos datos. */
export function cifrasPermitidas(d: DatosBot): Set<number> {
  const s = new Set<number>([d.limite, d.gastado, Math.abs(d.teQueda), d.porDia, d.totalSuscripciones, d.totalSuscripcionesAnual, d.totalProximosCobros]);
  for (const x of d.suscripciones) s.add(x.mensual);
  for (const x of d.proximosCobros) s.add(x.monto);
  return s;
}

/** Cifras del texto que NO están en los datos. Si hay alguna, la respuesta del modelo se descarta. */
export function cifrasInventadas(texto: string, d: DatosBot): number[] {
  const ok = cifrasPermitidas(d);
  return cifrasEnTexto(texto).filter((n) => !ok.has(Math.round(n)));
}
