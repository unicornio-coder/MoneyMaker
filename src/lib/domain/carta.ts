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
