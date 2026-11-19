// Lectura escalonada de un estado de cuenta. Decisión de escalabilidad de JC (noviembre de 2026): el costo de la
// IA por archivo es lo único de la app que crece con cada usuario, así que cada archivo empieza por el lector más
// barato y solo sube al siguiente cuando la propia app puede comprobar que el anterior no bastó.
//
//   1. Reglas (sin costo). Se aceptan solo si la suma de movimientos cuadra con los totales que imprime el banco.
//   2. Modelo económico. Se acepta salvo que sus totales no cuadren.
//   3. Modelo fuerte. Solo cuando el económico no cuadró o falló.
//
// El juez es siempre el cuadre contra el propio estado de cuenta, no una corazonada: el cliente no ve ningún tope
// ni espera, y la lectura cara se paga únicamente en los archivos que de verdad la necesitan.

import { evaluarCuadre } from '@/lib/domain/dedupe';
import type { MovimientoNormalizado, ResumenEstado } from '@/lib/domain/tipos';

export type Lectura = { resumen: ResumenEstado; movimientos: MovimientoNormalizado[]; tokens: { entrada: number; salida: number } };
export type Peldano = 'reglas' | 'economico' | 'fuerte';
export type ResultadoEscalera = { lectura: Lectura; peldano: Peldano; intentos: Peldano[] };

const cuadreDe = (l: Lectura) => evaluarCuadre(l.movimientos, l.resumen).cuadre;

/** Las reglas solo valen cuando se pueden comprobar: hay movimientos y sus sumas cuadran con los totales del banco. */
export function reglasVerificadas(l: Lectura | null): l is Lectura {
  return !!l && l.resumen.esEstadoDeCuenta && l.movimientos.length > 0 && cuadreDe(l) === 'ok';
}

const sumar = (a: Lectura['tokens'], b: Lectura['tokens']) => ({ entrada: a.entrada + b.entrada, salida: a.salida + b.salida });

/**
 * Sube por los lectores del más barato al más caro. `reintentable` dice si un error del modelo económico merece
 * probar con el fuerte (un fallo del servicio sí; una llave rechazada o un documento ilegible no).
 */
export async function leerEscalonado(lectores: {
  reglas?: () => Lectura | null;
  economico: () => Promise<Lectura>;
  fuerte: () => Promise<Lectura>;
  reintentable?: (error: unknown) => boolean;
}): Promise<ResultadoEscalera> {
  const intentos: Peldano[] = [];
  if (lectores.reglas) {
    intentos.push('reglas');
    const porReglas = lectores.reglas();
    if (reglasVerificadas(porReglas)) return { lectura: porReglas, peldano: 'reglas', intentos };
  }

  intentos.push('economico');
  let economica: Lectura | null = null;
  try {
    economica = await lectores.economico();
  } catch (e) {
    if (!lectores.reintentable?.(e)) throw e;
  }
  if (economica && cuadreDe(economica) !== 'sin_cuadre') return { lectura: economica, peldano: 'economico', intentos };

  intentos.push('fuerte');
  try {
    const fuerte = await lectores.fuerte();
    return { lectura: { ...fuerte, tokens: economica ? sumar(economica.tokens, fuerte.tokens) : fuerte.tokens }, peldano: 'fuerte', intentos };
  } catch (e) {
    // El modelo fuerte falló pero el económico sí leyó algo: se entrega esa lectura (irá marcada "sin cuadre" para revisión).
    if (economica) return { lectura: economica, peldano: 'economico', intentos };
    throw e;
  }
}
