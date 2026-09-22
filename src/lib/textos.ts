// Textos del flujo "Agregar cuenta → subir estado de cuenta". Vienen de Producto (qa/entregables/textos-flujo.json).

import textosJson from '../../qa/entregables/textos-flujo.json';

export const TEXTOS = textosJson;

type Vars = Record<string, string | number>;

/** Sustituye {clave} por su valor. */
export function t(plantilla: string, vars: Vars = {}): string {
  return plantilla.replace(/\{(\w+)\}/g, (_, k: string) => (vars[k] == null ? `{${k}}` : String(vars[k])));
}

/** Texto de error por código; si el código no existe, el genérico de servidor. */
export function textoError(codigo: string): string {
  const errores = TEXTOS.errores as Record<string, string>;
  return errores[codigo] ?? errores.servidor;
}
