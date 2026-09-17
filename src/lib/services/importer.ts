// Importador de estados de cuenta: CSV / XLSX / PDF → MovimientoCrudo[].
// Funciona sin LLM para CSV/XLSX (mapeo de columnas por heurística). PDF usa texto + LLM; sin llave, regex de líneas.

import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { MovimientoCrudo } from '@/lib/domain/tipos';
import { infoBanco } from '@/lib/domain/comercios';
import { extraerMovimientosDeTexto } from './llm';

export type ResultadoImportacion = {
  movimientos: MovimientoCrudo[];
  banco: string | null;
  formato: 'csv' | 'xlsx' | 'pdf';
  /** Ultimos 4 dígitos si aparecen en el archivo. */
  ultimos4: string | null;
  advertencias: string[];
};

const COL_FECHA = /^(fecha|date|fecha de operaci|fecha operaci|fecha de cargo|fecha valor|f\. ?operaci|dia)/i;
const COL_DESC = /^(descripci|concepto|detalle|description|movimiento|referencia|establecimiento|comercio|memo)/i;
const COL_CARGO = /^(cargo|retiro|debito|débito|debit|salida|egreso|withdrawal|importe cargo)/i;
const COL_ABONO = /^(abono|deposito|depósito|credito|crédito|credit|entrada|ingreso|deposit|importe abono)/i;
const COL_MONTO = /^(monto|importe|amount|cantidad|valor|total)/i;

const MESES: Record<string, number> = { ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6, jul: 7, ago: 8, sep: 9, sept: 9, oct: 10, nov: 11, dic: 12, jan: 1, apr: 4, aug: 8, dec: 12 };

/** Acepta dd/mm/yyyy, dd-mm-yy, yyyy-mm-dd, '12 sep 2026', '12/sep', números de Excel. */
export function parsearFecha(v: unknown, anioPorDefecto = new Date().getFullYear()): string | null {
  if (v == null || v === '') return null;
  if (typeof v === 'number') {
    // Serial de Excel
    const d = XLSX.SSF.parse_date_code(v);
    if (!d) return null;
    return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
  }
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v).trim().toLowerCase();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/.exec(s);
  if (m) {
    const y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  m = /^(\d{1,2})[\s\/\-]*(?:de\s+)?([a-z]{3,4})[a-z]*\.?[\s\/\-]*(?:de\s+)?(\d{2,4})?/.exec(s);
  if (m && MESES[m[2]]) {
    const y = m[3] ? (m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])) : anioPorDefecto;
    return `${y}-${String(MESES[m[2]]).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  return null;
}

/** '$1,238.00' → 1238 · '(450.00)' → -450 · '-1,200' → -1200 */
export function parsearMonto(v: unknown): number | null {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return v;
  let s = String(v).replace(/[^\d.,()\-+]/g, '');
  if (!s) return null;
  const negativo = /^\(.*\)$/.test(s) || s.startsWith('-');
  s = s.replace(/[()\-+]/g, '');
  // 1.234,56 (formato europeo) vs 1,234.56
  if (/,\d{2}$/.test(s) && !/\.\d{2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
  else s = s.replace(/,/g, '');
  const n = Number(s);
  if (Number.isNaN(n)) return null;
  return negativo ? -n : n;
}

type Fila = Record<string, unknown>;

function detectarColumnas(encabezados: string[]) {
  const buscar = (re: RegExp) => encabezados.find((h) => re.test(h.trim()));
  return { fecha: buscar(COL_FECHA), desc: buscar(COL_DESC), cargo: buscar(COL_CARGO), abono: buscar(COL_ABONO), monto: buscar(COL_MONTO) };
}

/** Convierte filas tabulares (con encabezados) en movimientos. */
export function filasAMovimientos(filas: Fila[], advertencias: string[]): MovimientoCrudo[] {
  if (!filas.length) return [];
  const encabezados = Object.keys(filas[0]);
  let cols = detectarColumnas(encabezados);

  // Sin encabezados claros: busca la fila que sí los tenga (los bancos ponen títulos arriba).
  if (!cols.fecha || !cols.desc) {
    for (let i = 0; i < Math.min(filas.length, 25); i++) {
      const candidatos = Object.values(filas[i]).map((v) => String(v ?? ''));
      const c = detectarColumnas(candidatos);
      if (c.fecha && c.desc && (c.monto || c.cargo || c.abono)) {
        const claves = Object.keys(filas[i]);
        const mapa = Object.fromEntries(claves.map((k, j) => [k, candidatos[j]]));
        filas = filas.slice(i + 1).map((f) => Object.fromEntries(Object.entries(f).map(([k, v]) => [mapa[k] || k, v])));
        cols = c;
        break;
      }
    }
  }
  if (!cols.fecha || !cols.desc || !(cols.monto || cols.cargo || cols.abono)) {
    advertencias.push('No reconocimos las columnas de fecha, concepto y monto.');
    return [];
  }

  const out: MovimientoCrudo[] = [];
  for (const f of filas) {
    const fecha = parsearFecha(f[cols.fecha]);
    const descripcion = String(f[cols.desc] ?? '').trim();
    if (!fecha || !descripcion) continue;
    let monto: number | null = null;
    let esAbono = false;
    if (cols.cargo || cols.abono) {
      const cargo = cols.cargo ? parsearMonto(f[cols.cargo]) : null;
      const abono = cols.abono ? parsearMonto(f[cols.abono]) : null;
      if (abono && Math.abs(abono) > 0) {
        monto = Math.abs(abono);
        esAbono = true;
      } else if (cargo && Math.abs(cargo) > 0) {
        monto = Math.abs(cargo);
      }
    }
    if (monto == null && cols.monto) {
      const m = parsearMonto(f[cols.monto]);
      if (m != null && m !== 0) {
        monto = Math.abs(m);
        esAbono = m > 0;
      }
    }
    if (monto == null) continue;
    out.push({ fecha, descripcion, monto, esAbono });
  }
  return out;
}

function detectarBanco(texto: string): string | null {
  const t = texto.toLowerCase();
  for (const k of ['bbva', 'banorte', 'santander', 'hsbc', 'banamex', 'citibanamex', 'scotiabank', 'inbursa', 'azteca', 'nu', 'american express', 'amex', 'coppel', 'hey banco', 'klar', 'stori', 'gbm', 'bitso', 'cetesdirecto', 'kuspit', 'mercado pago']) {
    if (new RegExp(`\\b${k}\\b`).test(t)) return infoBanco(k === 'american express' ? 'amex' : k === 'hey banco' ? 'hey' : k).nombre;
  }
  return null;
}

function detectarUltimos4(texto: string): string | null {
  const m = /(?:tarjeta|cuenta|no\.?|número|numero)[^\d]{0,30}(?:\*{2,}|x{2,}|•{2,}|\d{4}[\s-]){0,3}(\d{4})\b/i.exec(texto);
  return m ? m[1] : null;
}

/** Punto de entrada: detecta el formato por nombre y parsea. */
export async function importarArchivo(nombre: string, datos: Buffer): Promise<ResultadoImportacion> {
  const advertencias: string[] = [];
  const ext = nombre.toLowerCase().split('.').pop() ?? '';

  if (ext === 'csv' || ext === 'txt') {
    const texto = datos.toString('utf8');
    const parsed = Papa.parse<Fila>(texto, { header: true, skipEmptyLines: true, dynamicTyping: false });
    const movimientos = filasAMovimientos(parsed.data, advertencias);
    return { movimientos, banco: detectarBanco(texto.slice(0, 2000)), formato: 'csv', ultimos4: detectarUltimos4(texto.slice(0, 2000)), advertencias };
  }

  if (ext === 'xlsx' || ext === 'xls') {
    const wb = XLSX.read(datos, { type: 'buffer', cellDates: false });
    let movimientos: MovimientoCrudo[] = [];
    let textoCabecera = '';
    for (const hoja of wb.SheetNames) {
      const ws = wb.Sheets[hoja];
      const filas = XLSX.utils.sheet_to_json<Fila>(ws, { defval: '' });
      textoCabecera += XLSX.utils.sheet_to_csv(ws).slice(0, 1500) + '\n';
      const m = filasAMovimientos(filas, advertencias);
      if (m.length > movimientos.length) movimientos = m;
    }
    return { movimientos, banco: detectarBanco(textoCabecera), formato: 'xlsx', ultimos4: detectarUltimos4(textoCabecera), advertencias };
  }

  if (ext === 'pdf') {
    // pdf-parse se carga bajo demanda (Node only).
    const pdfParse = (await import('pdf-parse')).default;
    const { text } = await pdfParse(datos);
    const banco = detectarBanco(text.slice(0, 4000));
    const ultimos4 = detectarUltimos4(text.slice(0, 4000));
    let movimientos = await extraerMovimientosDeTexto(text, banco);
    if (!movimientos) {
      movimientos = movimientosPorRegex(text);
      if (!movimientos.length) advertencias.push('No pudimos leer este PDF automáticamente. Prueba con el CSV o Excel del banco.');
      else advertencias.push('PDF leído con reglas básicas; revisa fechas y montos.');
    }
    return { movimientos, banco, formato: 'pdf', ultimos4, advertencias };
  }

  advertencias.push('Formato no soportado. Sube CSV, Excel o PDF.');
  return { movimientos: [], banco: null, formato: 'csv', ultimos4: null, advertencias };
}

/** Respaldo sin LLM: líneas "dd/mm[/yyyy]  descripción  $monto" o "dd mmm  descripción  monto". */
export function movimientosPorRegex(texto: string): MovimientoCrudo[] {
  const out: MovimientoCrudo[] = [];
  const re = /^\s*(\d{1,2}[\/\-][a-z0-9]{2,4}(?:[\/\-]\d{2,4})?|\d{1,2}\s+[a-z]{3,4}\.?(?:\s+\d{2,4})?)\s+(.+?)\s+(-?\(?\$?\s?[\d,]+\.\d{2}\)?)(?:\s+(-?\(?\$?\s?[\d,]+\.\d{2}\)?))?\s*$/i;
  for (const linea of texto.split(/\r?\n/)) {
    const m = re.exec(linea);
    if (!m) continue;
    const fecha = parsearFecha(m[1]);
    const monto = parsearMonto(m[3]);
    if (!fecha || monto == null || monto === 0) continue;
    const desc = m[2].trim();
    const esAbono = /abono|pago recibido|deposito|depósito|su pago|nomina|nómina/i.test(desc) || (m[4] != null && monto < 0);
    out.push({ fecha, descripcion: desc, monto: Math.abs(monto), esAbono });
  }
  return out;
}
