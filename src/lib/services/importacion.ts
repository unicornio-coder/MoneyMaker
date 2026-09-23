// Ciclo de vida de una importación de estado de cuenta: analizar (archivo → datos extraídos, sin guardar el archivo)
// y confirmar (datos extraídos → cuenta + movimientos + recálculo). Lo usan las rutas /api/imports.

import type { Repo } from '@/lib/data/repo';
import { infoBanco } from '@/lib/domain/comercios';
import { evaluarCuadre, indexarRepetidos } from '@/lib/domain/dedupe';
import { aPesos } from '@/lib/domain/money';
import type { Cuenta, Importacion, MovimientoCrudo, MovimientoNormalizado, ResumenEstado, TipoCuentaEstado } from '@/lib/domain/tipos';
import { registrar } from './analytics';
import { ingerirMovimientos, propuestaQuincena, recalcular, type PropuestaQuincena } from './ingest';
import { ErrorImportacion, esErrorImportacion, extraerArchivo, hashArchivo } from './ingestion';
import { PDF_MAX_BYTES } from './ingestion/pdf';

const RESUMEN_VACIO: ResumenEstado = { institucion: null, producto: null, tipoCuenta: null, ultimos4: null, periodoInicio: null, periodoFin: null, fechaCorte: null, fechaLimitePago: null, pagoMinimoCentavos: null, saldoAlCorteCentavos: null, limiteCreditoCentavos: null, totalCargosCentavos: null, totalAbonosCentavos: null, tarjetasAdicionales: [], esEstadoDeCuenta: false, paginas: null };

export type ResultadoAnalisis = { importacion: Importacion; codigo?: string };

const PROGRESO: Record<NonNullable<Importacion['etapa']>, number> = { subido: 10, leyendo: 30, extrayendo: 60, cuadrando: 90, listo: 100 };

/** Datos extraídos reutilizables de una importación previa del mismo archivo (caché por hash): sin volver a leer ni pagar el modelo. */
function extraccionEnCache(previa: Importacion | null): Importacion | null {
  if (!previa) return null;
  if (!['revisar', 'descartado', 'error'].includes(previa.estado)) return null;
  if (!previa.resumen?.esEstadoDeCuenta || !previa.movimientos?.length || !previa.metodo) return null;
  return previa;
}

/**
 * Paso 1 (rápido, < 1 s): registra la importación en `procesando`. Si el mismo archivo ya se leyó antes, reutiliza
 * la extracción y la deja directamente en `revisar` (sin modelo). Confirmado → `ya_subido`.
 */
export async function iniciarAnalisis(repo: Repo, userId: string, archivo: { nombre: string; datos: Buffer; contraseña?: string | null }): Promise<ResultadoAnalisis & { procesar: boolean }> {
  if (archivo.datos.length > PDF_MAX_BYTES) throw new ErrorImportacion('muy_grande');
  const archivoHash = hashArchivo(archivo.datos);
  const previa = await repo.importacionPorHash(userId, archivoHash);
  if (previa?.estado === 'confirmado') return { importacion: previa, codigo: 'ya_subido', procesar: false };
  if (previa?.estado === 'revisar' && !archivo.contraseña) return { importacion: previa, procesar: false };
  if (previa?.estado === 'procesando' && !archivo.contraseña && Date.now() - new Date(previa.updatedAt).getTime() < 5 * 60_000) return { importacion: previa, procesar: false };

  const cache = archivo.contraseña ? null : extraccionEnCache(previa);
  if (cache) {
    const repetido = await mismoPeriodoConfirmado(repo, userId, cache.resumen, cache.id);
    const imp = await repo.guardarImportacion(userId, { ...cache, id: cache.id, archivo: archivo.nombre.slice(0, 200), estado: repetido ? 'error' : 'revisar', error: repetido ? 'ya_subido' : null, etapa: 'listo', progreso: 100, tokensEntrada: 0, tokensSalida: 0, duracionMs: 0 });
    await registrar(repo, userId, 'import_lista', { metodo: cache.metodo, ms: 0, movimientos: cache.movimientos.length, cache: true });
    return { importacion: imp, codigo: repetido ? 'ya_subido' : undefined, procesar: false };
  }

  const base: Omit<Importacion, 'id' | 'createdAt' | 'updatedAt'> = {
    archivo: archivo.nombre.slice(0, 200),
    archivoHash,
    tamanoBytes: archivo.datos.length,
    estado: 'procesando',
    metodo: null,
    resumen: previa?.resumen ?? RESUMEN_VACIO,
    movimientos: [],
    advertencias: [],
    cuadre: null,
    cuentaId: null,
    insertados: 0,
    duplicados: 0,
    tokensEntrada: 0,
    tokensSalida: 0,
    error: null,
    etapa: 'subido',
    progreso: PROGRESO.subido,
    duracionMs: null,
  };
  const imp = await repo.guardarImportacion(userId, { ...base, id: previa?.id });
  await registrar(repo, userId, 'import_iniciada', { kb: Math.round(archivo.datos.length / 1024) });
  return { importacion: imp, procesar: true };
}

/**
 * Paso 2 (lento): lee el archivo y deja la importación en `revisar`, `necesita_contraseña` o `error`,
 * actualizando `etapa`/`progreso` en el camino. El buffer se descarta al terminar.
 */
export async function procesarAnalisis(repo: Repo, userId: string, id: string, archivo: { nombre: string; datos: Buffer; contraseña?: string | null }): Promise<ResultadoAnalisis> {
  const inicio = Date.now();
  let imp = await repo.importacion(userId, id);
  if (!imp) throw new ErrorImportacion('servidor', 'Importación no encontrada');
  const base = { ...imp, id: imp.id };
  const etapa = async (e: NonNullable<Importacion['etapa']>) => {
    imp = await repo.guardarImportacion(userId, { ...base, estado: 'procesando', etapa: e, progreso: PROGRESO[e] });
  };

  try {
    const r = await extraerArchivo({ nombre: archivo.nombre, datos: archivo.datos, contraseña: archivo.contraseña, onEtapa: (e) => void etapa(e).catch(() => undefined) });
    const cuadre = evaluarCuadre(r.movimientos, r.resumen).cuadre;
    const duracionMs = Date.now() - inicio;
    // Mismo estado (banco, tarjeta, tipo y periodo) ya confirmado aunque los bytes cambien (otra descarga): no se repite.
    const repetido = await mismoPeriodoConfirmado(repo, userId, r.resumen, imp.id);
    if (repetido) {
      imp = await repo.guardarImportacion(userId, { ...base, estado: 'error', error: 'ya_subido', resumen: r.resumen, movimientos: r.movimientos, metodo: r.metodo, tokensEntrada: r.tokens.entrada, tokensSalida: r.tokens.salida, etapa: 'listo', progreso: 100, duracionMs });
      return { importacion: imp, codigo: 'ya_subido' };
    }
    imp = await repo.guardarImportacion(userId, { ...base, estado: 'revisar', metodo: r.metodo, resumen: r.resumen, movimientos: r.movimientos, advertencias: r.advertencias, cuadre, tokensEntrada: r.tokens.entrada, tokensSalida: r.tokens.salida, error: null, etapa: 'listo', progreso: 100, duracionMs });
    await registrar(repo, userId, 'import_lista', { metodo: r.metodo, ms: duracionMs, movimientos: r.movimientos.length, cache: false });
    return { importacion: imp };
  } catch (e) {
    const codigo = esErrorImportacion(e) ? e.codigo : 'servidor';
    const estado: Importacion['estado'] = codigo === 'necesita_contraseña' || codigo === 'contraseña_incorrecta' ? 'necesita_contraseña' : 'error';
    if (!esErrorImportacion(e)) console.error('[importacion] analizar', e instanceof Error ? e.name : 'error');
    imp = await repo.guardarImportacion(userId, { ...base, estado, error: codigo, etapa: 'listo', progreso: 100, duracionMs: Date.now() - inicio });
    await registrar(repo, userId, 'import_error', { codigo, kb: Math.round(archivo.datos.length / 1024) });
    return { importacion: imp, codigo };
  }
}

/** Analiza de una vez (iniciar + procesar). Lo usan las pruebas y el modo síncrono de la API. */
export async function analizarArchivo(repo: Repo, userId: string, archivo: { nombre: string; datos: Buffer; contraseña?: string | null }): Promise<ResultadoAnalisis> {
  const r = await iniciarAnalisis(repo, userId, archivo);
  if (!r.procesar) return { importacion: r.importacion, codigo: r.codigo };
  return procesarAnalisis(repo, userId, r.importacion.id, archivo);
}

const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** Cambios del usuario en la tabla de revisión (antes de confirmar): fecha, descripción, monto, cargo/abono; quitar filas. */
export async function actualizarMovimientosImportacion(repo: Repo, userId: string, id: string, movimientos: unknown): Promise<Importacion | null> {
  const imp = await repo.importacion(userId, id);
  if (!imp || imp.estado !== 'revisar') return null;
  if (!Array.isArray(movimientos) || movimientos.length > 2000) return null;
  const limpios: MovimientoNormalizado[] = [];
  for (const m of movimientos as Record<string, unknown>[]) {
    if (!m || typeof m !== 'object') return null;
    const fecha = typeof m.fecha === 'string' && RE_FECHA.test(m.fecha) ? m.fecha : null;
    const descripcion = typeof m.descripcion === 'string' ? m.descripcion.trim().slice(0, 200) : '';
    const montoCentavos = typeof m.montoCentavos === 'number' && Number.isInteger(m.montoCentavos) && m.montoCentavos >= 0 ? m.montoCentavos : null;
    if (!fecha || !descripcion || montoCentavos == null) return null;
    limpios.push({ fecha, descripcion, montoCentavos, esAbono: !!m.esAbono, moneda: typeof m.moneda === 'string' ? m.moneda : 'MXN', esPosibleSuscripcion: !!m.esPosibleSuscripcion, msi: m.msi && typeof m.msi === 'object' ? (m.msi as MovimientoNormalizado['msi']) : null, tarjetaUltimos4: typeof m.tarjetaUltimos4 === 'string' ? m.tarjetaUltimos4 : null });
  }
  const cuadre = evaluarCuadre(limpios, imp.resumen).cuadre;
  return repo.guardarImportacion(userId, { ...imp, id: imp.id, movimientos: limpios, cuadre, advertencias: imp.advertencias.filter((a) => a !== 'sin_cuadre').concat(cuadre === 'sin_cuadre' ? ['sin_cuadre'] : []) });
}

async function mismoPeriodoConfirmado(repo: Repo, userId: string, resumen: ResumenEstado, propioId: string): Promise<boolean> {
  if (!resumen.institucion || !resumen.periodoInicio || !resumen.periodoFin) return false;
  const banco = infoBanco(resumen.institucion).nombre;
  const confirmadas = await repo.importaciones(userId, { estados: ['confirmado'] });
  return confirmadas.some((c) => c.id !== propioId && c.resumen.institucion && infoBanco(c.resumen.institucion).nombre === banco && (c.resumen.tipoCuenta ?? null) === (resumen.tipoCuenta ?? null) && (c.resumen.ultimos4 ?? null) === (resumen.ultimos4 ?? null) && c.resumen.periodoInicio === resumen.periodoInicio && c.resumen.periodoFin === resumen.periodoFin);
}

export type ConfirmacionItem = { id: string; cuentaId?: string | null; institucion?: string | null; tipoCuenta?: TipoCuentaEstado | null; ultimos4?: string | null };
export type ResultadoConfirmacion = {
  resultados: { id: string; ok: boolean; cuentaId?: string; insertados: number; duplicados: number; codigo?: string }[];
  cuentaIds: string[];
  totales: { cuentas: number; movimientos: number; duplicados: number; suscripciones: number; msi: number };
  propuestaQuincena: PropuestaQuincena | null;
};

function nombreCuenta(banco: string, tipo: TipoCuentaEstado, producto: string | null): string {
  const sufijo = tipo === 'credito' ? 'Crédito' : tipo === 'inversion' ? 'Inversión' : 'Débito';
  return producto && producto.length <= 28 ? `${banco} ${producto}` : `${banco} ${sufijo}`;
}

/** Identidad de cuenta: (institución, últimos 4, tipo). Si existe se reutiliza (venga de PDF o de Belvo); si no, se crea. */
async function resolverCuenta(repo: Repo, userId: string, item: ConfirmacionItem, resumen: ResumenEstado): Promise<Cuenta> {
  if (item.cuentaId) {
    const c = await repo.cuenta(userId, item.cuentaId);
    if (c) return c;
  }
  const institucion = item.institucion ?? resumen.institucion ?? 'Banco';
  const tipo: TipoCuentaEstado = item.tipoCuenta ?? resumen.tipoCuenta ?? 'debito';
  const ultimos4 = item.ultimos4 ?? resumen.ultimos4 ?? null;
  const info = infoBanco(institucion);
  const cuentas = await repo.cuentas(userId);
  const existente = cuentas.find((c) => c.banco === info.nombre && c.tipo === tipo && (ultimos4 && c.ultimos4 ? c.ultimos4 === ultimos4 : !c.ultimos4 && !ultimos4));
  if (existente) return existente;

  const externalId = `import:${info.nombre}:${tipo}:${ultimos4 ?? 'sn'}`;
  const link = await repo.guardarLink(userId, { proveedor: 'import', externalId, institucion: info.nombre, institucionDominio: info.dominio, estado: 'ok', ultimoSync: new Date().toISOString() });
  return repo.guardarCuenta(userId, { linkId: link.id, externalId, nombre: nombreCuenta(info.nombre, tipo, resumen.producto), banco: info.nombre, bancoDominio: info.dominio || null, tipo, ultimos4, saldo: 0, color: info.color, activo: true });
}

/** Saldo, corte, límite y pago mínimo se toman del estado más reciente (por fecha de corte o fin de periodo). */
async function actualizarCuentaConResumen(repo: Repo, userId: string, cuenta: Cuenta, resumen: ResumenEstado): Promise<Cuenta> {
  const corteNuevo = resumen.fechaCorte ?? resumen.periodoFin;
  if (cuenta.fechaCorte && corteNuevo && corteNuevo < cuenta.fechaCorte) return cuenta;
  const cambios: Partial<Cuenta> = {};
  if (resumen.saldoAlCorteCentavos != null) cambios.saldo = aPesos(resumen.saldoAlCorteCentavos);
  if (resumen.limiteCreditoCentavos != null) cambios.limite = aPesos(resumen.limiteCreditoCentavos);
  if (resumen.pagoMinimoCentavos != null) cambios.pagoMinimo = aPesos(resumen.pagoMinimoCentavos);
  if (corteNuevo) cambios.fechaCorte = corteNuevo;
  if (resumen.fechaLimitePago) cambios.fechaLimite = resumen.fechaLimitePago;
  if (!Object.keys(cambios).length) return cuenta;
  return repo.guardarCuenta(userId, { ...cuenta, ...cambios });
}

/** Confirma varias importaciones en lote: una cuenta por identidad, movimientos deduplicados, un solo recálculo. */
export async function confirmarImportaciones(repo: Repo, userId: string, items: ConfirmacionItem[]): Promise<ResultadoConfirmacion> {
  const resultados: ResultadoConfirmacion['resultados'] = [];
  const cuentaIds = new Set<string>();
  let movimientos = 0;
  let duplicados = 0;

  for (const item of items) {
    const imp = await repo.importacion(userId, item.id);
    if (!imp) {
      resultados.push({ id: item.id, ok: false, insertados: 0, duplicados: 0, codigo: 'no_encontrada' });
      continue;
    }
    if (imp.estado === 'confirmado') {
      resultados.push({ id: item.id, ok: true, cuentaId: imp.cuentaId ?? undefined, insertados: imp.insertados, duplicados: imp.duplicados, codigo: 'ya_subido' });
      if (imp.cuentaId) cuentaIds.add(imp.cuentaId);
      continue;
    }
    if (imp.estado !== 'revisar') {
      resultados.push({ id: item.id, ok: false, insertados: 0, duplicados: 0, codigo: imp.error ?? imp.estado });
      continue;
    }
    try {
      const resumen: ResumenEstado = { ...imp.resumen, institucion: item.institucion ?? imp.resumen.institucion, tipoCuenta: item.tipoCuenta ?? imp.resumen.tipoCuenta, ultimos4: item.ultimos4 ?? imp.resumen.ultimos4 };
      let cuenta = await resolverCuenta(repo, userId, item, resumen);
      cuenta = await actualizarCuentaConResumen(repo, userId, cuenta, resumen);
      const crudos: MovimientoCrudo[] = indexarRepetidos(imp.movimientos).map((m) => ({ fecha: m.fecha, descripcion: m.descripcion, monto: aPesos(m.montoCentavos), esAbono: m.esAbono, repeticion: m.repeticion, esPosibleSuscripcion: m.esPosibleSuscripcion, msi: m.msi ?? null }));
      const r = await ingerirMovimientos(repo, userId, cuenta, crudos, 'import', { recalcular: false });
      await repo.guardarImportacion(userId, { ...imp, id: imp.id, estado: 'confirmado', cuentaId: cuenta.id, insertados: r.insertados, duplicados: r.duplicados });
      await registrar(repo, userId, 'importacion', { formato: imp.metodo, movimientos: r.insertados, banco: resumen.institucion });
      resultados.push({ id: item.id, ok: true, cuentaId: cuenta.id, insertados: r.insertados, duplicados: r.duplicados });
      cuentaIds.add(cuenta.id);
      movimientos += r.insertados;
      duplicados += r.duplicados;
    } catch (e) {
      console.error('[importacion] confirmar', e instanceof Error ? e.name : 'error');
      resultados.push({ id: item.id, ok: false, insertados: 0, duplicados: 0, codigo: esErrorImportacion(e) ? e.codigo : 'servidor' });
    }
  }

  await recalcular(repo, userId);
  const recurrentes = await repo.recurrentes(userId);
  const activos = recurrentes.filter((r) => r.activo);
  return {
    resultados,
    cuentaIds: [...cuentaIds],
    totales: { cuentas: cuentaIds.size, movimientos, duplicados, suscripciones: activos.filter((r) => r.tipo === 'suscripcion').length, msi: activos.filter((r) => r.tipo === 'msi').length },
    propuestaQuincena: await propuestaQuincena(repo, userId),
  };
}

export async function descartarImportacion(repo: Repo, userId: string, id: string): Promise<boolean> {
  const imp = await repo.importacion(userId, id);
  if (!imp || imp.estado === 'confirmado') return false;
  await repo.guardarImportacion(userId, { ...imp, id: imp.id, estado: 'descartado' });
  return true;
}
