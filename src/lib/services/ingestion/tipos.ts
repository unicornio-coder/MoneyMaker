// Interfaz única de ingesta: cualquier fuente (PDF hoy; correo y Belvo mañana) entrega el mismo resultado
// y el resto de la app no sabe de dónde vino.

import type { MetodoExtraccion, MovimientoNormalizado, ResumenEstado } from '@/lib/domain/tipos';

export type NormalizedTransaction = MovimientoNormalizado;

export type EntradaExtraccion = {
  nombre: string;
  datos: Buffer;
  contraseña?: string | null;
};

export type ResultadoExtraccion = {
  resumen: ResumenEstado;
  movimientos: NormalizedTransaction[];
  advertencias: string[];
  metodo: MetodoExtraccion;
  tokens: { entrada: number; salida: number };
};

export interface TransactionSource {
  readonly nombre: 'statement-pdf' | 'statement-table' | 'email' | 'belvo';
  extraer(entrada: EntradaExtraccion): Promise<ResultadoExtraccion>;
}

/** Claves de `textos-flujo.json → errores`. La UI muestra el texto; el código solo pasa la clave. */
export type CodigoErrorImportacion =
  | 'no_pdf'
  | 'corrupto'
  | 'muy_grande'
  | 'demasiados'
  | 'ilegible'
  | 'no_es_estado'
  | 'necesita_contraseña'
  | 'contraseña_incorrecta'
  | 'ya_subido'
  | 'sin_cuadre'
  | 'sin_movimientos'
  | 'servidor'
  | 'sin_conexion'
  | 'limite_api'
  | 'sesion_expirada'
  | 'sin_modelo'
  | 'no_disponible';

export class ErrorImportacion extends Error {
  constructor(
    public readonly codigo: CodigoErrorImportacion,
    detalle?: string,
  ) {
    super(detalle ?? codigo);
    this.name = 'ErrorImportacion';
  }
}

export function esErrorImportacion(e: unknown): e is ErrorImportacion {
  return e instanceof ErrorImportacion;
}
