// Punto de entrada de la ingesta por archivo. Elige la fuente por tipo de archivo y devuelve el mismo resultado siempre.

import { createHash } from 'node:crypto';
import { fuenteBelvo } from './belvo';
import { fuenteCorreo } from './email';
import { esPdf } from './pdf';
import { fuentePdf } from './statement-pdf';
import { fuenteTabla } from './statement-table';
import { ErrorImportacion, type EntradaExtraccion, type ResultadoExtraccion, type TransactionSource } from './tipos';

export const FUENTES: Record<TransactionSource['nombre'], TransactionSource> = {
  'statement-pdf': fuentePdf,
  'statement-table': fuenteTabla,
  email: fuenteCorreo,
  belvo: fuenteBelvo,
};

export const EXTENSIONES_TABLA = ['csv', 'txt', 'xlsx', 'xls'];

export function hashArchivo(datos: Buffer): string {
  return createHash('sha256').update(datos).digest('hex');
}

export function fuenteParaArchivo(nombre: string, datos: Buffer): TransactionSource {
  if (esPdf(datos)) return fuentePdf;
  const ext = nombre.toLowerCase().split('.').pop() ?? '';
  if (EXTENSIONES_TABLA.includes(ext)) return fuenteTabla;
  throw new ErrorImportacion('no_pdf');
}

export function extraerArchivo(entrada: EntradaExtraccion): Promise<ResultadoExtraccion> {
  return fuenteParaArchivo(entrada.nombre, entrada.datos).extraer(entrada);
}

export { ErrorImportacion, esErrorImportacion } from './tipos';
export type { CodigoErrorImportacion, EntradaExtraccion, NormalizedTransaction, ResultadoExtraccion, TransactionSource } from './tipos';
