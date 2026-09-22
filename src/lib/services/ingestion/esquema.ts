// Esquema que devuelve el modelo al leer un estado de cuenta. Montos en pesos tal como están impresos;
// aquí se convierten a centavos. Provisional hasta alinear con HOY-ESTADO-DE-CUENTA.md paso 1 (T-001).

import { z } from 'zod';
import { aCentavos } from '@/lib/domain/money';
import type { MovimientoNormalizado, ResumenEstado } from '@/lib/domain/tipos';

const fechaISO = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const MovimientoExtraidoSchema = z.object({
  fecha: fechaISO.describe('Fecha de la operación en formato yyyy-mm-dd, con el año del periodo del estado de cuenta'),
  descripcion: z.string().describe('Descripción tal como aparece impresa, sin recortar'),
  monto: z.number().describe('Monto positivo en pesos mexicanos con dos decimales'),
  esAbono: z.boolean().describe('true si es pago recibido, abono, depósito, devolución o reembolso; false si es cargo, compra, retiro, comisión o interés'),
  monedaOriginal: z.string().nullable().describe('Código de moneda si el cargo fue en otra moneda (USD, EUR); null si fue en pesos'),
  montoOriginal: z.number().nullable().describe('Monto en la moneda original si el cargo fue en otra moneda; null si fue en pesos'),
  esPosibleSuscripcion: z.boolean().describe('true si parece un cobro recurrente de suscripción o membresía (streaming, apps, gimnasio, software, telefonía)'),
  razonSuscripcion: z.string().nullable().describe('Por qué parece suscripción, en pocas palabras; null si no lo parece'),
  msiCuota: z.number().nullable().describe('Número de cuota si es una compra a meses sin intereses (viene en la sección de compras a meses o en el texto como 03/12); null si no'),
  msiTotal: z.number().nullable().describe('Total de cuotas de la compra a meses sin intereses; null si no'),
  tarjetaUltimos4: z.string().nullable().describe('Últimos 4 dígitos de la tarjeta adicional que hizo el cargo, solo si el documento lo distingue; null si no'),
});

export const ExtraccionSchema = z.object({
  esEstadoDeCuenta: z.boolean().describe('false si el documento no es un estado de cuenta bancario (recibo, ticket, factura, otra cosa)'),
  institucion: z.string().nullable().describe('Nombre corto del banco o emisor: BBVA, Nu, Amex, Banorte, Santander, HSBC, Banamex, Scotiabank, Inbursa, Hey, Klar, Stori, Mercado Pago, GBM+, Bitso, CetesDirecto; null si no se identifica'),
  producto: z.string().nullable().describe('Nombre comercial del producto: Tarjeta Oro, Cuenta Nómina, The Platinum Card; null si no aparece'),
  tipoCuenta: z.enum(['credito', 'debito', 'inversion']).nullable().describe('credito para tarjetas de crédito; debito para cuentas de cheques, nómina, ahorro o débito; inversion para casas de bolsa, cripto y fondos'),
  ultimos4: z.string().nullable().describe('Últimos 4 dígitos de la tarjeta o cuenta principal; null si no aparecen'),
  periodoInicio: fechaISO.nullable().describe('Primer día del periodo del estado de cuenta'),
  periodoFin: fechaISO.nullable().describe('Último día del periodo del estado de cuenta'),
  fechaCorte: fechaISO.nullable().describe('Fecha de corte; null si no aparece'),
  fechaLimitePago: fechaISO.nullable().describe('Fecha límite de pago (tarjetas de crédito); null si no aplica'),
  pagoMinimo: z.number().nullable().describe('Pago mínimo del periodo en pesos; null si no aplica'),
  pagoParaNoGenerarIntereses: z.number().nullable().describe('Pago para no generar intereses en pesos; null si no aparece'),
  saldoAlCorte: z.number().nullable().describe('Saldo al corte o saldo total en pesos: lo que se debe (crédito) o lo que hay (débito/inversión); null si no aparece'),
  limiteCredito: z.number().nullable().describe('Límite de crédito en pesos; null si no aplica'),
  totalCargos: z.number().nullable().describe('Total de cargos/compras del periodo según el resumen del banco, en pesos; null si no aparece'),
  totalAbonos: z.number().nullable().describe('Total de pagos y abonos del periodo según el resumen del banco, en pesos; null si no aparece'),
  tarjetasAdicionales: z.array(z.string()).describe('Últimos 4 dígitos de cada tarjeta adicional mencionada; lista vacía si no hay'),
  movimientos: z.array(MovimientoExtraidoSchema).describe('TODOS los movimientos de la tabla de operaciones, en orden. Sin resúmenes, totales, saldos ni publicidad'),
});

export type Extraccion = z.infer<typeof ExtraccionSchema>;

function limpiar4(v: string | null): string | null {
  if (!v) return null;
  const d = v.replace(/\D/g, '');
  return d.length >= 4 ? d.slice(-4) : null;
}

export function aResumen(e: Extraccion, paginas: number | null): ResumenEstado {
  return {
    institucion: e.institucion?.trim() || null,
    producto: e.producto?.trim() || null,
    tipoCuenta: e.tipoCuenta,
    ultimos4: limpiar4(e.ultimos4),
    periodoInicio: e.periodoInicio,
    periodoFin: e.periodoFin,
    fechaCorte: e.fechaCorte,
    fechaLimitePago: e.fechaLimitePago,
    pagoMinimoCentavos: e.pagoMinimo == null ? null : aCentavos(e.pagoMinimo),
    saldoAlCorteCentavos: e.saldoAlCorte == null ? null : aCentavos(Math.abs(e.saldoAlCorte)),
    limiteCreditoCentavos: e.limiteCredito == null ? null : aCentavos(e.limiteCredito),
    totalCargosCentavos: e.totalCargos == null ? null : aCentavos(Math.abs(e.totalCargos)),
    totalAbonosCentavos: e.totalAbonos == null ? null : aCentavos(Math.abs(e.totalAbonos)),
    tarjetasAdicionales: e.tarjetasAdicionales.map((t) => limpiar4(t)).filter((t): t is string => !!t),
    esEstadoDeCuenta: e.esEstadoDeCuenta,
    paginas,
  };
}

export function aMovimientos(e: Extraccion): MovimientoNormalizado[] {
  return e.movimientos
    .filter((m) => m.monto > 0 && m.descripcion.trim())
    .map((m) => ({
      fecha: m.fecha,
      descripcion: m.descripcion.trim(),
      montoCentavos: aCentavos(Math.abs(m.monto)),
      esAbono: m.esAbono,
      moneda: 'MXN',
      montoOriginalCentavos: m.montoOriginal == null ? null : aCentavos(Math.abs(m.montoOriginal)),
      monedaOriginal: m.monedaOriginal?.trim().toUpperCase() || null,
      esPosibleSuscripcion: m.esPosibleSuscripcion,
      razonSuscripcion: m.razonSuscripcion,
      msi: m.msiCuota && m.msiTotal && m.msiTotal >= 2 && m.msiCuota <= m.msiTotal ? { cuota: Math.round(m.msiCuota), total: Math.round(m.msiTotal) } : null,
      tarjetaUltimos4: limpiar4(m.tarjetaUltimos4),
    }));
}
