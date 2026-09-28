// Presupuesto desde la hoja de cálculo del usuario: filas "concepto, monto" → líneas por categoría nuestra.
// Lógica pura: el archivo se lee en el navegador y aquí solo llegan celdas.

import { normalizar } from './texto';
import { CATEGORIAS_GASTO } from './categorias';

export type LineaImportada = { categoriaId: string; nombre: string; limite: number; origen: string };
export type ResultadoImportacion = { lineas: LineaImportada[]; sinMonto: string[]; ignoradas: number };

/** Palabras que mandan a cada categoría (ya normalizadas: minúsculas, sin acentos). Orden: primera coincidencia gana. */
const SINONIMOS: [string, string[]][] = [
  ['suscripciones', ['suscrip', 'netflix', 'spotify', 'hbo', 'disney', 'prime', 'apple', 'youtube', 'gym', 'gimnasio', 'streaming']],
  ['servicios', ['servicio', 'luz', 'cfe', 'agua', 'gas', 'internet', 'telefon', 'celular', 'telcel', 'izzi', 'totalplay', 'megacable', 'predial']],
  ['hogar', ['renta', 'hipoteca', 'casa', 'hogar', 'depa', 'mantenimiento', 'muebles', 'limpieza']],
  ['super', ['super', 'despensa', 'mandado', 'walmart', 'soriana', 'chedraui', 'costco', 'heb', 'oxxo', 'abarrotes']],
  ['comida', ['comida', 'restaurante', 'restaurant', 'cafe', 'rappi', 'uber eats', 'didi food', 'antojos', 'desayuno', 'cena', 'comer']],
  ['transporte', ['transporte', 'gasolina', 'gas ', 'uber', 'didi', 'taxi', 'metro', 'estacionamiento', 'caseta', 'auto', 'coche', 'carro', 'verificacion', 'seguro auto']],
  ['salud', ['salud', 'doctor', 'medic', 'farmacia', 'dentista', 'seguro medico', 'gastos medicos', 'terapia', 'psicolog']],
  ['colegiaturas', ['colegiatura', 'escuela', 'universidad', 'curso', 'clases', 'educacion', 'libros escolares', 'kinder', 'guarderia']],
  ['entretenimiento', ['entretenimiento', 'cine', 'salidas', 'diversion', 'bar', 'antro', 'concierto', 'videojuego', 'hobby', 'ocio']],
  ['viajes', ['viaje', 'vacaciones', 'vuelo', 'hotel', 'airbnb', 'avion']],
  ['online', ['amazon', 'mercado libre', 'mercadolibre', 'compras', 'shein', 'ropa', 'liverpool', 'zara', 'tienda', 'regalos']],
  ['msi', ['msi', 'meses sin intereses', 'mensualidad', 'a meses']],
  ['comisiones', ['comision', 'intereses', 'anualidad', 'tarjeta de credito']],
  ['efectivo', ['efectivo', 'cajero', 'retiro']],
  ['fijos', ['fijo', 'seguro', 'ahorro', 'inversion', 'afore', 'cetes']],
];

const IDS = new Set(CATEGORIAS_GASTO.map((c) => c.id));

/** Palabras cortas ("gas", "bar", "msi") solo cuentan como palabra completa; las largas, como fragmento. */
function coincide(texto: string, palabra: string): boolean {
  const p = palabra.trim();
  return p.length <= 3 ? ` ${texto} `.includes(` ${p} `) : texto.includes(p);
}

/** Categoría para un concepto libre: sinónimos → nombre exacto de categoría → "otros". */
export function categoriaParaConcepto(concepto: string): string {
  const n = normalizar(concepto).toLowerCase();
  for (const [id, palabras] of SINONIMOS) if (palabras.some((p) => coincide(n, p))) return id;
  for (const c of CATEGORIAS_GASTO) if (n === normalizar(c.nombre).toLowerCase()) return c.id;
  return 'otros';
}

function aMonto(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? Math.abs(v) : null;
  if (typeof v !== 'string') return null;
  const limpio = v.replace(/[^\d.,-]/g, '').replace(/,(?=\d{3}(\D|$))/g, '').replace(',', '.');
  const n = Number(limpio);
  return limpio && Number.isFinite(n) ? Math.abs(n) : null;
}

const ENCABEZADO = /^(concepto|categor|rubro|descripcion|gasto|presupuesto|monto|importe|total|mes|quincena)/;

/**
 * Convierte filas de una hoja en líneas de presupuesto. Toma la primera celda con texto como concepto y la primera
 * celda numérica a su derecha como monto. Suma los conceptos que caen en la misma categoría y conserva el nombre
 * cuando es uno solo. Ignora encabezados, totales y filas vacías.
 */
export function lineasDesdeFilas(filas: unknown[][]): ResultadoImportacion {
  const porCategoria = new Map<string, { limite: number; nombres: string[] }>();
  const sinMonto: string[] = [];
  let ignoradas = 0;
  for (const fila of filas) {
    if (!Array.isArray(fila)) continue;
    const iConcepto = fila.findIndex((c) => typeof c === 'string' && c.trim());
    if (iConcepto < 0) {
      ignoradas++;
      continue;
    }
    const concepto = String(fila[iConcepto]).trim();
    const n = normalizar(concepto).toLowerCase();
    if (ENCABEZADO.test(n) && !fila.slice(iConcepto + 1).some((c) => typeof c === 'number')) {
      ignoradas++;
      continue;
    }
    if (/^(total|suma|subtotal|ingreso|sueldo|nomina|salario)/.test(n)) {
      ignoradas++;
      continue;
    }
    const monto = fila.slice(iConcepto + 1).map(aMonto).find((m) => m != null && m > 0) ?? null;
    if (monto == null) {
      sinMonto.push(concepto);
      continue;
    }
    const id = categoriaParaConcepto(concepto);
    const actual = porCategoria.get(id) ?? { limite: 0, nombres: [] };
    actual.limite += monto;
    actual.nombres.push(concepto);
    porCategoria.set(id, actual);
  }
  const lineas: LineaImportada[] = [];
  for (const [categoriaId, v] of porCategoria) {
    if (!IDS.has(categoriaId)) continue;
    const nombre = v.nombres.length === 1 ? v.nombres[0] : (CATEGORIAS_GASTO.find((c) => c.id === categoriaId)?.nombre ?? categoriaId);
    lineas.push({ categoriaId, nombre, limite: Math.round(v.limite), origen: v.nombres.join(', ') });
  }
  lineas.sort((a, b) => b.limite - a.limite);
  return { lineas, sinMonto, ignoradas };
}
