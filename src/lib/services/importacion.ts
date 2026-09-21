// Ciclo de vida de una importación de estado de cuenta: analizar (archivo → datos extraídos, sin guardar el archivo)
// y confirmar (datos extraídos → cuenta + movimientos + recálculo). Lo usan las rutas /api/imports.

import type { Repo } from '@/lib/data/repo';
import { infoBanco } from '@/lib/domain/comercios';
import { evaluarCuadre, indexarRepetidos } from '@/lib/domain/dedupe';
import { aPesos } from '@/lib/domain/money';
import type { Cuenta, Importacion, MovimientoCrudo, ResumenEstado, TipoCuentaEstado } from '@/lib/domain/tipos';
import { registrar } from './analytics';
import { ingerirMovimientos, propuestaQuincena, recalcular, type PropuestaQuincena } from './ingest';
import { ErrorImportacion, esErrorImportacion, extraerArchivo, hashArchivo } from './ingestion';
import { PDF_MAX_BYTES } from './ingestion/pdf';

const RESUMEN_VACIO: ResumenEstado = { institucion: null, producto: null, tipoCuenta: null, ultimos4: null, periodoInicio: null, periodoFin: null, fechaCorte: null, fechaLimitePago: null, pagoMinimoCentavos: null, saldoAlCorteCentavos: null, limiteCreditoCentavos: null, totalCargosCentavos: null, totalAbonosCentavos: null, tarjetasAdicionales: [], esEstadoDeCuenta: false, paginas: null };

export type ResultadoAnalisis = { importacion: Importacion; codigo?: string };

/**
 * Lee un archivo y deja la importación en `revisar` (o `necesita_contraseña` / `error`).
 * El mismo archivo (hash) ya confirmado devuelve `ya_subido`; si estaba en revisión, devuelve la existente.
 */
export async function analizarArchivo(repo: Repo, userId: string, archivo: { nombre: string; datos: Buffer; contraseña?: string | null }): Promise<ResultadoAnalisis> {
  if (archivo.datos.length > PDF_MAX_BYTES) throw new ErrorImportacion('muy_grande');
  const archivoHash = hashArchivo(archivo.datos);
  const previa = await repo.importacionPorHash(userId, archivoHash);
  if (previa?.estado === 'confirmado') return { importacion: previa, codigo: 'ya_subido' };
  if (previa?.estado === 'revisar' && !archivo.contraseña) return { importacion: previa };

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
  };
  let imp = await repo.guardarImportacion(userId, { ...base, id: previa?.id });

  try {
    const r = await extraerArchivo({ nombre: archivo.nombre, datos: archivo.datos, contraseña: archivo.contraseña });
    const cuadre = evaluarCuadre(r.movimientos, r.resumen).cuadre;
    // Mismo estado (banco, tarjeta, tipo y periodo) ya confirmado aunque los bytes cambien (otra descarga): no se repite.
    const repetido = await mismoPeriodoConfirmado(repo, userId, r.resumen, imp.id);
    if (repetido) {
      imp = await repo.guardarImportacion(userId, { ...base, id: imp.id, estado: 'error', error: 'ya_subido', resumen: r.resumen, metodo: r.metodo, tokensEntrada: r.tokens.entrada, tokensSalida: r.tokens.salida });
      return { importacion: imp, codigo: 'ya_subido' };
    }
    imp = await repo.guardarImportacion(userId, { ...base, id: imp.id, estado: 'revisar', metodo: r.metodo, resumen: r.resumen, movimientos: r.movimientos, advertencias: r.advertencias, cuadre, tokensEntrada: r.tokens.entrada, tokensSalida: r.tokens.salida });
    return { importacion: imp };
  } catch (e) {
    const codigo = esErrorImportacion(e) ? e.codigo : 'servidor';
    const estado: Importacion['estado'] = codigo === 'necesita_contraseña' || codigo === 'contraseña_incorrecta' ? 'necesita_contraseña' : 'error';
    if (!esErrorImportacion(e)) console.error('[importacion] analizar', e instanceof Error ? e.name : 'error');
    imp = await repo.guardarImportacion(userId, { ...base, id: imp.id, estado, error: codigo });
    return { importacion: imp, codigo };
  }
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
  await repo.guardarImportacion(userId, { ...imp, id: imp.id, estado: 'descartado', movimientos: [] });
  return true;
}
