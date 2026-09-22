// Fuente: estado de cuenta en PDF. Con ANTHROPIC_API_KEY el PDF va a Claude como documento (o como texto si
// venía cifrado); sin llave se leen líneas con reglas. El buffer se descarta al salir.

import { evaluarCuadre } from '@/lib/domain/dedupe';
import { aCentavos } from '@/lib/domain/money';
import type { MovimientoNormalizado, ResumenEstado, TipoCuentaEstado } from '@/lib/domain/tipos';
import { extraerEstadoDeCuenta, hayLLM } from '../llm';
import { detectarBanco, detectarUltimos4, movimientosPorRegex, parsearFecha } from '../importer';
import { aMovimientos, aResumen } from './esquema';
import { esPdf, esPdfCifrado, leerPdf, PDF_MAX_BYTES, textoLegible, type PdfLeido } from './pdf';
import { ErrorImportacion, esErrorImportacion, type ResultadoExtraccion, type TransactionSource } from './tipos';

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

/**
 * Abre el PDF con pdf.js. Si el problema es la contraseña, se propaga; cualquier otro fallo de pdf.js devuelve null
 * (el modelo puede leer el PDF aunque pdf.js no, y así no dependemos de él en producción).
 */
async function intentarLeer(datos: Buffer, contraseña: string | null | undefined): Promise<PdfLeido | null> {
  try {
    return await leerPdf(datos, contraseña);
  } catch (e) {
    if (esErrorImportacion(e)) throw e;
    console.warn('[pdf] pdf.js no pudo abrir el archivo:', e instanceof Error ? `${e.name}: ${e.message.slice(0, 160)}` : 'error');
    return null;
  }
}

export const fuentePdf: TransactionSource = {
  nombre: 'statement-pdf',
  async extraer({ datos, contraseña }) {
    if (!esPdf(datos)) throw new ErrorImportacion('no_pdf');
    if (datos.length > PDF_MAX_BYTES) throw new ErrorImportacion('muy_grande');
    const cifrado = esPdfCifrado(datos);
    const pdf = await intentarLeer(datos, contraseña);
    if (cifrado && !pdf) throw new ErrorImportacion(contraseña ? 'contraseña_incorrecta' : 'necesita_contraseña');
    const legible = !!pdf && textoLegible(pdf.texto);
    const advertencias: string[] = [];
    let resultado: Omit<ResultadoExtraccion, 'advertencias'>;

    if (hayLLM()) {
      // El modelo lee el PDF completo (tablas, logos, fuentes ofuscadas). Solo si venía cifrado va el texto ya descifrado.
      if (!cifrado) {
        const { extraccion, tokens } = await extraerEstadoDeCuenta({ pdf: datos });
        resultado = { resumen: aResumen(extraccion, pdf?.paginas ?? null), movimientos: aMovimientos(extraccion), metodo: 'claude-pdf', tokens };
      } else {
        if (!pdf || !legible) throw new ErrorImportacion('ilegible', 'PDF cifrado sin texto legible');
        const { extraccion, tokens } = await extraerEstadoDeCuenta({ texto: pdf.texto });
        resultado = { resumen: aResumen(extraccion, pdf.paginas), movimientos: aMovimientos(extraccion), metodo: 'claude-texto', tokens };
      }
    } else {
      if (!pdf) throw new ErrorImportacion('corrupto');
      if (!legible) throw new ErrorImportacion('sin_modelo', 'El PDF no trae texto legible; hace falta la lectura con modelo');
      const r = extraerPorReglas(pdf.texto, pdf.paginas);
      resultado = { ...r, metodo: 'reglas', tokens: { entrada: 0, salida: 0 } };
      advertencias.push('Leído con reglas básicas (sin modelo). Revisa fechas y montos.');
    }

    if (!resultado.resumen.esEstadoDeCuenta) throw new ErrorImportacion('no_es_estado');
    if (!resultado.movimientos.length) {
      if (resultado.resumen.saldoAlCorteCentavos == null && resultado.resumen.periodoFin == null) throw new ErrorImportacion(legible ? 'no_es_estado' : 'ilegible');
      advertencias.push('sin_movimientos');
    }
    if (resultado.movimientos.some((m) => m.montoCentavos === 0 && m.montoOriginalCentavos)) advertencias.push('moneda_sin_equivalente');
    if (evaluarCuadre(resultado.movimientos, resultado.resumen).cuadre === 'sin_cuadre') advertencias.push('sin_cuadre');
    return { ...resultado, advertencias };
  },
};
