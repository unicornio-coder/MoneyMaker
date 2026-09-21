// Fuente: estado de cuenta en PDF. Con ANTHROPIC_API_KEY el PDF va a Claude como documento (o como texto si
// venía cifrado); sin llave se leen líneas con reglas. El buffer se descarta al salir.

import { evaluarCuadre } from '@/lib/domain/dedupe';
import { aCentavos } from '@/lib/domain/money';
import type { MovimientoNormalizado, ResumenEstado, TipoCuentaEstado } from '@/lib/domain/tipos';
import { extraerEstadoDeCuenta, hayLLM } from '../llm';
import { detectarBanco, detectarUltimos4, movimientosPorRegex, parsearFecha } from '../importer';
import { aMovimientos, aResumen } from './esquema';
import { leerPdf } from './pdf';
import { ErrorImportacion, type ResultadoExtraccion, type TransactionSource } from './tipos';

const RE_CREDITO = /PAGO M[IÍ]NIMO|FECHA L[IÍ]MITE DE PAGO|L[IÍ]MITE DE CR[EÉ]DITO|TARJETA DE CR[EÉ]DITO|PAGO PARA NO GENERAR INTERESES/i;
const RE_DEBITO = /CUENTA DE CHEQUES|CUENTA DE N[OÓ]MINA|CUENTA DE D[EÉ]BITO|SALDO PROMEDIO|DEP[OÓ]SITOS|CUENTA DE AHORRO/i;
const RE_INVERSION = /CASA DE BOLSA|PORTAFOLIO|RENDIMIENTO|CETES|CRIPTO|BITCOIN|T[IÍ]TULOS/i;

function fecha(texto: string, etiqueta: RegExp): string | null {
  const m = new RegExp(`(?:${etiqueta.source})` + String.raw`[^\d]{0,25}(\d{1,2}[\/\-][a-z0-9]{2,4}(?:[\/\-]\d{2,4})?|\d{1,2}\s+(?:de\s+)?[a-z]{3,10}\.?\s+(?:de\s+)?\d{4})`, 'i').exec(texto);
  return m ? parsearFecha(m[1]) : null;
}

function montoCentavos(texto: string, etiqueta: RegExp): number | null {
  const m = new RegExp(`(?:${etiqueta.source})` + String.raw`[^\d$\-(]{0,30}\$?\s?(\(?-?[\d,]+\.\d{2}\)?)`, 'i').exec(texto);
  if (!m) return null;
  const n = Number(m[1].replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? aCentavos(n) : null;
}

function tipoPorTexto(texto: string): TipoCuentaEstado | null {
  if (RE_CREDITO.test(texto)) return 'credito';
  if (RE_INVERSION.test(texto) && !RE_DEBITO.test(texto)) return 'inversion';
  if (RE_DEBITO.test(texto)) return 'debito';
  return null;
}

/** Sin modelo: banco, tarjeta, periodo y movimientos por expresiones regulares. Suficiente para PDFs de texto limpio. */
export function extraerPorReglas(texto: string, paginas: number | null): { resumen: ResumenEstado; movimientos: MovimientoNormalizado[] } {
  const cabecera = texto.slice(0, 6000);
  const movs = movimientosPorRegex(texto);
  const fechas = movs.map((m) => m.fecha).sort();
  const periodo = /PERIODO[^\d]{0,20}(\d{1,2}[\/\-][a-z0-9]{2,4}(?:[\/\-]\d{2,4})?)\s*(?:al|a|-|–)\s*(\d{1,2}[\/\-][a-z0-9]{2,4}(?:[\/\-]\d{2,4})?)/i.exec(texto);
  const resumen: ResumenEstado = {
    institucion: detectarBanco(cabecera),
    producto: null,
    tipoCuenta: tipoPorTexto(cabecera),
    ultimos4: detectarUltimos4(cabecera),
    periodoInicio: (periodo && parsearFecha(periodo[1])) || fechas[0] || null,
    periodoFin: (periodo && parsearFecha(periodo[2])) || fechas[fechas.length - 1] || null,
    fechaCorte: fecha(texto, /FECHA DE CORTE/),
    fechaLimitePago: fecha(texto, /FECHA L[IÍ]MITE DE PAGO/),
    pagoMinimoCentavos: montoCentavos(texto, /PAGO M[IÍ]NIMO/),
    saldoAlCorteCentavos: montoCentavos(texto, /SALDO AL CORTE|SALDO ACTUAL|NUEVO SALDO|SALDO TOTAL|SALDO FINAL/),
    limiteCreditoCentavos: montoCentavos(texto, /L[IÍ]MITE DE CR[EÉ]DITO/),
    totalCargosCentavos: montoCentavos(texto, /TOTAL (?:DE )?CARGOS|TOTAL (?:DE )?COMPRAS|CARGOS DEL PERIODO/),
    totalAbonosCentavos: montoCentavos(texto, /TOTAL (?:DE )?ABONOS|TOTAL (?:DE )?PAGOS|PAGOS Y ABONOS/),
    tarjetasAdicionales: [],
    esEstadoDeCuenta: movs.length > 0 || /ESTADO DE CUENTA/i.test(cabecera),
    paginas,
  };
  const movimientos: MovimientoNormalizado[] = movs.map((m) => ({ fecha: m.fecha, descripcion: m.descripcion, montoCentavos: aCentavos(m.monto), esAbono: m.esAbono, moneda: 'MXN', esPosibleSuscripcion: false }));
  return { resumen, movimientos };
}

export const fuentePdf: TransactionSource = {
  nombre: 'statement-pdf',
  async extraer({ datos, contraseña }) {
    const pdf = await leerPdf(datos, contraseña);
    const advertencias: string[] = [];
    let resultado: Omit<ResultadoExtraccion, 'advertencias'>;

    if (hayLLM()) {
      // Cifrado: el modelo no puede abrirlo, así que va el texto ya descifrado en memoria.
      const { extraccion, tokens } = await extraerEstadoDeCuenta(pdf.cifrado ? { texto: pdf.texto } : { pdf: datos });
      resultado = { resumen: aResumen(extraccion, pdf.paginas), movimientos: aMovimientos(extraccion), metodo: pdf.cifrado ? 'claude-texto' : 'claude-pdf', tokens };
    } else {
      if (pdf.texto.length < 40) throw new ErrorImportacion('ilegible');
      const r = extraerPorReglas(pdf.texto, pdf.paginas);
      resultado = { ...r, metodo: 'reglas', tokens: { entrada: 0, salida: 0 } };
      advertencias.push('Leído con reglas básicas (sin modelo). Revisa fechas y montos.');
    }

    if (!resultado.resumen.esEstadoDeCuenta) throw new ErrorImportacion('no_es_estado');
    if (!resultado.movimientos.length) {
      if (resultado.resumen.saldoAlCorteCentavos == null && resultado.resumen.periodoFin == null) throw new ErrorImportacion(pdf.texto.length < 40 ? 'ilegible' : 'no_es_estado');
      advertencias.push('sin_movimientos');
    }
    if (resultado.movimientos.some((m) => m.montoCentavos === 0 && m.montoOriginalCentavos)) advertencias.push('moneda_sin_equivalente');
    if (evaluarCuadre(resultado.movimientos, resultado.resumen).cuadre === 'sin_cuadre') advertencias.push('sin_cuadre');
    return { ...resultado, advertencias };
  },
};
