// Fuente: CSV, TXT o Excel exportado del banco. Primero columnas por heurística (sin modelo, gratis); si las reglas no
// entienden la tabla, las hojas se convierten a texto y las lee el modelo igual que a un PDF. Solo se rechaza como
// "no es estado de cuenta" cuando el modelo lo dice.

import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { evaluarCuadre } from '@/lib/domain/dedupe';
import { aCentavos } from '@/lib/domain/money';
import type { MovimientoNormalizado, ResumenEstado } from '@/lib/domain/tipos';
import { detectarBanco, detectarUltimos4, filasAMovimientos } from '../importer';
import { extraerEstadoDeCuenta, hayLLM } from '../llm';
import { aMovimientos, aResumen } from './esquema';
import { ErrorImportacion, type ResultadoExtraccion, type TransactionSource } from './tipos';

type Fila = Record<string, unknown>;

/** Máximo de texto que se manda al modelo (≈ 60 mil tokens). Una hoja de banco de un mes cabe de sobra. */
const MAX_TEXTO = 250_000;

/** Sin fechas ni montos en todo el texto no hay nada que leer: no es un estado de cuenta, ni vale la pena pedírselo al modelo. */
export function pareceTenerMovimientos(texto: string): boolean {
  const fechas = texto.match(/\d{1,2}[\/\-.]\d{1,2}(?:[\/\-.]\d{2,4})?|\d{1,2}\s+(?:de\s+)?[a-z]{3,10}\.?\s+(?:de\s+)?\d{2,4}|\d{4}-\d{2}-\d{2}/gi)?.length ?? 0;
  return fechas >= 2 || (fechas >= 1 && /\d[\d,]*\.\d{2}|\$\s?\d/.test(texto));
}

/** Texto plano de todas las hojas, con el nombre de cada una, para que el modelo lo lea como un documento. */
export function hojasATexto(wb: XLSX.WorkBook): string {
  return wb.SheetNames.map((hoja) => `--- Hoja: ${hoja} ---\n${XLSX.utils.sheet_to_csv(wb.Sheets[hoja], { blankrows: false })}`).join('\n\n');
}

export const fuenteTabla: TransactionSource = {
  nombre: 'statement-table',
  async extraer({ nombre, datos, onEtapa }) {
    const ext = nombre.toLowerCase().split('.').pop() ?? '';
    const advertencias: string[] = [];
    let crudos: ReturnType<typeof filasAMovimientos> = [];
    let texto = '';
    onEtapa?.('leyendo');

    if (ext === 'csv' || ext === 'txt') {
      texto = datos.toString('utf8');
      crudos = filasAMovimientos(Papa.parse<Fila>(texto, { header: true, skipEmptyLines: true, dynamicTyping: false }).data, advertencias);
    } else if (ext === 'xlsx' || ext === 'xls') {
      let wb: XLSX.WorkBook;
      try {
        wb = XLSX.read(datos, { type: 'buffer', cellDates: false });
      } catch {
        throw new ErrorImportacion('corrupto', 'No se pudo abrir el libro de Excel');
      }
      texto = hojasATexto(wb);
      for (const hoja of wb.SheetNames) {
        const m = filasAMovimientos(XLSX.utils.sheet_to_json<Fila>(wb.Sheets[hoja], { defval: '' }), advertencias);
        if (m.length > crudos.length) crudos = m;
      }
    } else {
      throw new ErrorImportacion('no_pdf');
    }

    if (crudos.length) {
      const cabecera = texto.slice(0, 3000);
      const fechas = crudos.map((m) => m.fecha).sort();
      const resumen: ResumenEstado = {
        institucion: detectarBanco(cabecera),
        producto: null,
        tipoCuenta: null,
        ultimos4: detectarUltimos4(cabecera),
        periodoInicio: fechas[0] ?? null,
        periodoFin: fechas[fechas.length - 1] ?? null,
        fechaCorte: null,
        fechaLimitePago: null,
        pagoMinimoCentavos: null,
        saldoAlCorteCentavos: null,
        limiteCreditoCentavos: null,
        totalCargosCentavos: null,
        totalAbonosCentavos: null,
        tarjetasAdicionales: [],
        esEstadoDeCuenta: true,
        paginas: null,
      };
      const movimientos: MovimientoNormalizado[] = crudos.map((m) => ({ fecha: m.fecha, descripcion: m.descripcion, montoCentavos: aCentavos(m.monto), esAbono: m.esAbono, moneda: 'MXN', esPosibleSuscripcion: false }));
      onEtapa?.('cuadrando');
      return { resumen, movimientos, advertencias, metodo: 'tabla', tokens: { entrada: 0, salida: 0 } };
    }

    // Las reglas no reconocieron columnas: el modelo lee el texto de las hojas antes de rechazar el archivo.
    if (!texto.trim() || !pareceTenerMovimientos(texto)) throw new ErrorImportacion('no_es_estado', texto.trim() ? 'Sin fechas ni montos en el archivo' : 'El archivo está vacío');
    if (!hayLLM()) throw new ErrorImportacion('sin_modelo', advertencias[0] ?? 'Las reglas de tabla no reconocieron las columnas y no hay modelo');
    onEtapa?.('extrayendo');
    const { extraccion, tokens } = await extraerEstadoDeCuenta({ texto: `Archivo: ${nombre}\n\n${texto.slice(0, MAX_TEXTO)}` });
    const resultado: Omit<ResultadoExtraccion, 'advertencias'> = { resumen: aResumen(extraccion, null), movimientos: aMovimientos(extraccion), metodo: 'claude-texto', tokens };
    onEtapa?.('cuadrando');
    if (!resultado.resumen.esEstadoDeCuenta) throw new ErrorImportacion('no_es_estado');
    if (!resultado.movimientos.length) {
      if (resultado.resumen.saldoAlCorteCentavos == null && resultado.resumen.periodoFin == null) throw new ErrorImportacion('no_es_estado');
      advertencias.push('sin_movimientos');
    }
    if (resultado.movimientos.some((m) => m.montoCentavos === 0 && m.montoOriginalCentavos)) advertencias.push('moneda_sin_equivalente');
    if (evaluarCuadre(resultado.movimientos, resultado.resumen).cuadre === 'sin_cuadre') advertencias.push('sin_cuadre');
    return { ...resultado, advertencias: advertencias.filter((a) => !a.startsWith('No reconocimos')) };
  },
};
