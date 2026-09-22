// Fuente: CSV o Excel exportado del banco. Sin modelo: columnas por heurística.

import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { aCentavos } from '@/lib/domain/money';
import type { MovimientoNormalizado, ResumenEstado } from '@/lib/domain/tipos';
import { detectarBanco, detectarUltimos4, filasAMovimientos } from '../importer';
import { ErrorImportacion, type TransactionSource } from './tipos';

type Fila = Record<string, unknown>;

export const fuenteTabla: TransactionSource = {
  nombre: 'statement-table',
  async extraer({ nombre, datos }) {
    const ext = nombre.toLowerCase().split('.').pop() ?? '';
    const advertencias: string[] = [];
    let crudos: ReturnType<typeof filasAMovimientos> = [];
    let cabecera = '';

    if (ext === 'csv' || ext === 'txt') {
      const texto = datos.toString('utf8');
      cabecera = texto.slice(0, 2000);
      crudos = filasAMovimientos(Papa.parse<Fila>(texto, { header: true, skipEmptyLines: true, dynamicTyping: false }).data, advertencias);
    } else if (ext === 'xlsx' || ext === 'xls') {
      const wb = XLSX.read(datos, { type: 'buffer', cellDates: false });
      for (const hoja of wb.SheetNames) {
        const ws = wb.Sheets[hoja];
        cabecera += XLSX.utils.sheet_to_csv(ws).slice(0, 1500) + '\n';
        const m = filasAMovimientos(XLSX.utils.sheet_to_json<Fila>(ws, { defval: '' }), advertencias);
        if (m.length > crudos.length) crudos = m;
      }
    } else {
      throw new ErrorImportacion('no_pdf');
    }
    if (!crudos.length) throw new ErrorImportacion('no_es_estado', advertencias[0]);

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
    return { resumen, movimientos, advertencias, metodo: 'tabla', tokens: { entrada: 0, salida: 0 } };
  },
};
