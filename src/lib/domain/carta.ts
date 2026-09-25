// Carta de cancelación: texto puro (sin I/O) para que el PDF y las pruebas usen la misma redacción.

import { formatFecha } from '@/lib/format';

export type DatosCarta = {
  servicio: string;
  titular: string;
  correo: string | null;
  ultimos4: string | null;
  montoMensual: number | null;
  fecha: string; // yyyy-mm-dd (hoy en CDMX)
  notas?: string | null;
};

export type Carta = { titulo: string; encabezado: string[]; parrafos: string[]; cierre: string[]; pie: string };

const pesos = (n: number) => `$${Math.round(n).toLocaleString('es-MX')} MXN`;

/** Redacción formal con fundamento en la Ley Federal de Protección al Consumidor (artículos 7, 56 y 76 bis). */
export function cartaCancelacion(d: DatosCarta): Carta {
  const identificacion = [d.correo ? `correo ${d.correo}` : null, d.ultimos4 ? `tarjeta con terminación ${d.ultimos4}` : null].filter(Boolean).join(' y ');
  const parrafos = [
    `Por este medio solicito la cancelación definitiva del servicio ${d.servicio} contratado a mi nombre${identificacion ? `, identificado con ${identificacion}` : ''}, con efectos a partir de la fecha de esta carta.`,
    `Con fundamento en los artículos 7, 56 y 76 bis de la Ley Federal de Protección al Consumidor, solicito que la cancelación se realice sin penalización ni cargos adicionales a los expresamente pactados, y que no se condicione a llamadas, visitas o trámites distintos a los que se usaron para contratar.`,
    `Solicito confirmación por escrito de la cancelación${d.correo ? ` al correo ${d.correo}` : ''} en un plazo no mayor a diez días hábiles, indicando la fecha efectiva y, en su caso, el último cargo aplicable.`,
    `A partir de esta fecha no autorizo cargos recurrentes${d.montoMensual ? ` (actualmente ${pesos(d.montoMensual)} al mes)` : ''} a mi tarjeta o cuenta por este servicio. Cualquier cargo posterior será desconocido ante la institución bancaria emisora y reportado a la Procuraduría Federal del Consumidor.`,
  ];
  if (d.notas?.trim()) parrafos.push(`Notas adicionales: ${d.notas.trim()}`);
  return {
    titulo: `Solicitud de cancelación de ${d.servicio}`,
    encabezado: [`${formatFecha(d.fecha, 'larga')}`, `Atención a clientes de ${d.servicio}`, 'A quien corresponda:'],
    parrafos,
    cierre: ['Atentamente,', d.titular],
    pie: `Carta preparada con MoneyMaker el ${formatFecha(d.fecha, 'larga')}. Consérvala junto con la confirmación del proveedor.`,
  };
}

export type DatosNegociacion = {
  servicio: string;
  titular: string;
  correo: string | null;
  numeroCuenta: string | null;
  precioActual: number;
  ofertaCompetencia?: { proveedor: string; precio: number } | null;
  antiguedadMeses?: number | null;
  fecha: string;
};

/** Carta para pedir una mejor tarifa (internet, telefonía, seguros): antigüedad, competencia y salida clara. */
export function cartaNegociacion(d: DatosNegociacion): Carta {
  const ident = [d.correo ? `correo ${d.correo}` : null, d.numeroCuenta ? `número de cuenta o línea ${d.numeroCuenta}` : null].filter(Boolean).join(' y ');
  const parrafos = [
    `Soy cliente de ${d.servicio}${d.antiguedadMeses ? ` desde hace ${d.antiguedadMeses} meses` : ''}${ident ? ` (${ident})` : ''} y actualmente pago ${pesos(d.precioActual)} al mes.`,
    d.ofertaCompetencia
      ? `${d.ofertaCompetencia.proveedor} me ofrece un servicio equivalente por ${pesos(d.ofertaCompetencia.precio)} al mes. Antes de cambiarme, solicito que igualen o mejoren esa tarifa, o que apliquen la mejor promoción vigente para clientes actuales.`
      : `Solicito que revisen mi tarifa y apliquen la mejor promoción vigente para clientes actuales o un plan equivalente de menor costo. He visto ofertas menores en el mercado para el mismo servicio.`,
    `Con fundamento en los artículos 7 y 76 bis de la Ley Federal de Protección al Consumidor, pido que la respuesta sea por escrito${d.correo ? ` al correo ${d.correo}` : ''} en un plazo no mayor a diez días hábiles, indicando la tarifa ofrecida, su vigencia y cualquier condición.`,
    `Si no es posible mejorar la tarifa, solicito en la misma respuesta las instrucciones para cancelar sin penalización al término del periodo pagado.`,
  ];
  return {
    titulo: `Solicitud de mejor tarifa a ${d.servicio}`,
    encabezado: [formatFecha(d.fecha, 'larga'), `Atención a clientes de ${d.servicio}`, 'A quien corresponda:'],
    parrafos,
    cierre: ['Atentamente,', d.titular],
    pie: `Carta preparada con MoneyMaker el ${formatFecha(d.fecha, 'larga')}. Guarda la respuesta del proveedor.`,
  };
}

/** Guion corto para la llamada o el chat de retención. */
export function guionNegociacion(d: Pick<DatosNegociacion, 'servicio' | 'precioActual' | 'ofertaCompetencia'>): string[] {
  return [
    `Hola, quiero revisar mi tarifa de ${d.servicio}. Hoy pago ${pesos(d.precioActual)} al mes.`,
    d.ofertaCompetencia ? `${d.ofertaCompetencia.proveedor} me da lo mismo por ${pesos(d.ofertaCompetencia.precio)}. ¿Lo igualan?` : 'He visto promociones más bajas para el mismo servicio. ¿Cuál es la mejor que me pueden dar hoy?',
    'Si no hay nada, pásame con retención de clientes, por favor.',
    'Confírmame por escrito la tarifa, la vigencia y si hay plazo forzoso. Si no, prefiero cancelar al final del periodo.',
  ];
}

/** Ahorro anual y comisión de MoneyMaker (25 % del ahorro del primer año) cuando el proveedor mejora la tarifa. */
export function resultadoNegociacion(precioActual: number, nuevoPrecio: number): { ahorroAnual: number; comision: number } {
  const ahorroAnual = Math.max(0, Math.round((precioActual - nuevoPrecio) * 12 * 100) / 100);
  return { ahorroAnual, comision: Math.round(ahorroAnual * 0.25 * 100) / 100 };
}
