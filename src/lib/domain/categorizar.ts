// Capa 1 del categorizador: reglas y diccionario. Sin I/O.
// Orden: corrección del usuario (fuera de aquí) → reglas bancarias (nómina, SPEI, pago tarjeta, comisiones, MSI)
// → diccionario de comercios → categoría del proveedor → 'otros' (candidato a LLM).

import { COMERCIOS, type ComercioConocido } from './comercios';
import type { MovimientoCrudo, TipoMovimiento } from './tipos';

export type Categorizado = {
  comercio: string;
  comercioDominio: string | null;
  categoriaId: string;
  categoriaFuente: 'regla' | 'proveedor';
  tipo: TipoMovimiento;
  esMsi: boolean;
  msiCuota: number | null;
  msiTotal: number | null;
  /** true si es una suscripción conocida (streaming, gimnasio…). */
  esSuscripcion: boolean;
  /** true si es un servicio del hogar/seguro/colegiatura (recurrente, no cancelable en línea). */
  esServicio: boolean;
  /** true si ninguna regla ni diccionario acertó: candidato al LLM. */
  desconocido: boolean;
};

/** Mayúsculas, sin acentos, sin caracteres raros, espacios colapsados. Conserva '*' y '/' que usan Apple/Google/Uber. */
export function normalizar(descripcion: string): string {
  return descripcion
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9 *&/.\-+]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Nombre limpio del comercio a partir de la descripción cruda (para desconocidos). */
export function nombreLimpio(descripcion: string): string {
  const n = normalizar(descripcion)
    .replace(/\b(COMPRA|CARGO|PAGO EN|PAGO|TDC|TDD|POS|RFC|SUC|SUCURSAL|MEXICO|MEX|CDMX|CD MX|MX|S\.?A\.? DE C\.?V\.?|SA DE CV|SAPI|S DE RL)\b/g, ' ')
    .replace(/\b(MSI|MESES SIN INTERESES|SIN INTERESES|CUOTA|PARCIALIDAD|PARC|DIFERIDO|A MESES)\b/g, ' ')
    .replace(/\b\d{1,2}\s*(?:DE|\/|-)\s*\d{1,2}\b/g, ' ')
    .replace(/\b\d{2,}\b/g, ' ')
    .replace(/[*\/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const palabras = n.split(' ').filter(Boolean).slice(0, 3);
  return palabras.map((p) => (p.length > 1 ? p[0] + p.slice(1).toLowerCase() : p)).join(' ') || 'Movimiento';
}

const RE_MSI = /(?:MSI|MESES SIN INTERESES|SIN INTERESES|CUOTA|PARCIALIDAD|PARC|DIFERIDO|A MESES)\D{0,12}(\d{1,2})\s*(?:DE|\/|-)\s*(\d{1,2})|(\d{1,2})\s*(?:DE|\/)\s*(\d{1,2})\s*(?:MSI|MESES|CUOTAS)/;

export function detectarMsi(descripcionNormalizada: string): { cuota: number; total: number } | null {
  const m = RE_MSI.exec(descripcionNormalizada);
  if (!m) return null;
  const cuota = Number(m[1] ?? m[3]);
  const total = Number(m[2] ?? m[4]);
  if (!cuota || !total || cuota > total || total > 48) return null;
  return { cuota, total };
}

const RE_NOMINA = /\b(NOMINA|SUELDO|PAGO DE NOMINA|DISPERSION|HONORARIOS|SALARIO)\b/;
const RE_PAGO_TARJETA = /\b(PAGO TARJETA|PAGO TDC|PAGO A TARJETA|PAGO DE TARJETA|ABONO A TARJETA|PAGO RECIBIDO|SU PAGO|GRACIAS POR SU PAGO|PAYMENT RECEIVED|PAGO BANCA|PAGO NU|PAGO AMEX)\b/;
const RE_SPEI = /\b(SPEI|TRANSFERENCIA|TRANSF|TRASPASO|ENVIO|ENVIADO|RECIBIDO|CLABE|DEPOSITO)\b/;
const RE_COMISION = /\b(COMISION|INTERES|INTERESES|IVA COMISION|ANUALIDAD|CARGO POR|MORATORIO|PENALIZACION|IVA)\b/;
const RE_RETIRO = /\b(RETIRO|DISPOSICION|CAJERO|ATM|EFECTIVO)\b/;
const RE_RENDIMIENTO = /\b(RENDIMIENTO|INTERESES GANADOS|GANANCIA|DIVIDENDO|CETES)\b/;
const RE_APORTACION = /\b(APORTACION|COMPRA DE TITULOS|INVERSION|GBM|BITSO|KUSPIT|CETESDIRECTO)\b/;

// Marcas primero (patrones más largos ganan: 'UBER EATS' sobre 'UBER'); los genéricos solo si ninguna marca coincide.
const MARCAS = COMERCIOS.filter((c) => !c.generico).sort((a, b) => b.patron.length - a.patron.length);
const GENERICOS = COMERCIOS.filter((c) => c.generico).sort((a, b) => b.patron.length - a.patron.length);

function buscarComercio(n: string): ComercioConocido | null {
  return MARCAS.find((c) => n.includes(c.patron)) ?? GENERICOS.find((c) => n.includes(c.patron)) ?? null;
}

const MAPA_PROVEEDOR: Record<string, string> = {
  // Categorías típicas de Belvo → nuestras
  'food & groceries': 'super',
  'groceries': 'super',
  'restaurants': 'comida',
  'food': 'comida',
  'transport & travel': 'transporte',
  'transportation': 'transporte',
  'travel': 'viajes',
  'online platforms & leisure': 'online',
  'shopping': 'online',
  'entertainment': 'entretenimiento',
  'bills & utilities': 'servicios',
  'utilities': 'servicios',
  'home & life': 'hogar',
  'health': 'salud',
  'healthcare': 'salud',
  'insurance': 'fijos',
  'education': 'colegiaturas',
  'credits & loans': 'fijos',
  'loans': 'fijos',
  'fees': 'comisiones',
  'taxes': 'comisiones',
  'income & payments': 'ingreso',
  'income': 'ingreso',
  'salary': 'nomina',
  'transfers': 'transferencia',
  'investments & savings': 'inversion',
  'withdrawal & atm': 'efectivo',
  'atm': 'efectivo',
  'subscriptions': 'suscripciones',
};

/** Categoriza un movimiento crudo con reglas y diccionario. */
export function categorizar(m: MovimientoCrudo, tipoCuenta: 'credito' | 'debito' | 'inversion' | 'efectivo' = 'debito'): Categorizado {
  const n = normalizar(m.descripcion);
  const msi = detectarMsi(n);
  const base: Categorizado = {
    comercio: nombreLimpio(m.descripcion),
    comercioDominio: null,
    categoriaId: 'otros',
    categoriaFuente: 'regla',
    tipo: m.esAbono ? 'ingreso' : 'gasto',
    esMsi: !!msi,
    msiCuota: msi?.cuota ?? null,
    msiTotal: msi?.total ?? null,
    esSuscripcion: false,
    esServicio: false,
    desconocido: false,
  };

  // Abonos
  if (m.esAbono) {
    if (tipoCuenta === 'credito' && (RE_PAGO_TARJETA.test(n) || RE_SPEI.test(n) || /\bPAGO\b/.test(n))) {
      return { ...base, comercio: 'Pago de tarjeta', categoriaId: 'pago_tarjeta', tipo: 'pago_tarjeta' };
    }
    if (RE_NOMINA.test(n)) return { ...base, comercio: 'Nómina', categoriaId: 'nomina', tipo: 'ingreso' };
    if (tipoCuenta === 'inversion' && RE_RENDIMIENTO.test(n)) return { ...base, comercio: 'Rendimiento', categoriaId: 'rendimiento', tipo: 'ingreso' };
    if (RE_SPEI.test(n)) return { ...base, comercio: base.comercio === 'Movimiento' ? 'Transferencia recibida' : base.comercio, categoriaId: 'transferencia', tipo: 'transferencia' };
    return { ...base, categoriaId: 'ingreso', tipo: 'ingreso' };
  }

  // Cargos
  if (tipoCuenta === 'inversion') {
    // En una cuenta de inversión un cargo es compra de títulos/cripto o retiro: nunca gasto.
    if (RE_RETIRO.test(n)) return { ...base, comercio: 'Retiro de inversión', categoriaId: 'transferencia', tipo: 'transferencia' };
    return { ...base, comercio: base.comercio === 'Movimiento' ? 'Aportación' : base.comercio, categoriaId: 'inversion', tipo: 'transferencia' };
  }
  if (RE_PAGO_TARJETA.test(n) && tipoCuenta !== 'credito') {
    return { ...base, comercio: 'Pago de tarjeta', categoriaId: 'pago_tarjeta', tipo: 'pago_tarjeta' };
  }
  if (RE_COMISION.test(n) && !buscarComercio(n)) {
    return { ...base, comercio: /ANUALIDAD/.test(n) ? 'Anualidad' : /INTERES/.test(n) ? 'Intereses' : 'Comisión', categoriaId: 'comisiones' };
  }
  if (RE_RETIRO.test(n) && !buscarComercio(n)) return { ...base, comercio: 'Retiro de efectivo', categoriaId: 'efectivo' };
  if (RE_APORTACION.test(n) && !buscarComercio(n)) {
    return { ...base, comercio: 'Aportación a inversión', categoriaId: 'inversion', tipo: 'transferencia' };
  }

  const c = buscarComercio(n);
  if (c) {
    return {
      ...base,
      comercio: c.nombre,
      comercioDominio: c.dominio || null,
      categoriaId: msi ? 'msi' : c.categoria,
      esSuscripcion: !!c.suscripcion,
      esServicio: !!c.servicio,
    };
  }

  if (msi) return { ...base, categoriaId: 'msi' };

  if (RE_SPEI.test(n)) return { ...base, comercio: base.comercio === 'Movimiento' ? 'Transferencia enviada' : base.comercio, categoriaId: 'transferencia', tipo: 'transferencia' };

  const prov = m.categoriaProveedor ? MAPA_PROVEEDOR[m.categoriaProveedor.toLowerCase()] : undefined;
  if (prov) return { ...base, categoriaId: prov, categoriaFuente: 'proveedor' };

  return { ...base, desconocido: true };
}

/** Hash estable para deduplicar entre fuentes (Belvo, importación, Gmail). */
export function hashMovimiento(cuentaId: string, fecha: string, descripcion: string, monto: number, esAbono: boolean): string {
  const clave = `${cuentaId}|${fecha.slice(0, 10)}|${normalizar(descripcion).replace(/\s/g, '')}|${Math.round(monto * 100)}|${esAbono ? 'A' : 'C'}`;
  // FNV-1a 32 bits en hex, suficiente para unicidad por usuario.
  let h = 0x811c9dc5;
  for (let i = 0; i < clave.length; i++) {
    h ^= clave.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0') + '-' + clave.length.toString(36);
}
