import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { CASOS, crearPdfEstado, iso } from '../../../scripts/qa-pdfs.mjs';
import { repoMemoria, reiniciarMemoria } from '@/lib/data/repo.memoria';
import { analizarArchivo, confirmarImportaciones, descartarImportacion } from './importacion';

const U = 'user-import';
const pdfs: Buffer[] = [];

beforeAll(async () => {
  delete process.env.ANTHROPIC_API_KEY;
  for (const c of CASOS) pdfs.push(await crearPdfEstado(c));
});

beforeEach(async () => {
  reiniciarMemoria();
  await repoMemoria.guardarPerfil(U, { email: 'qa@billup.mx', diasPago: [5, 20] });
});

describe('analizarArchivo', () => {
  it('deja la importación en revisar con resumen, movimientos y cuadre; el archivo no se guarda', async () => {
    const { importacion, codigo } = await analizarArchivo(repoMemoria, U, { nombre: CASOS[0].archivo, datos: pdfs[0] });
    expect(codigo).toBeUndefined();
    expect(importacion).toMatchObject({ estado: 'revisar', metodo: 'reglas', cuadre: 'ok', tamanoBytes: pdfs[0].length });
    expect(importacion.resumen).toMatchObject({ institucion: 'BBVA', tipoCuenta: 'credito', ultimos4: '0001', periodoFin: iso(CASOS[0].periodoFin) });
    expect(importacion.movimientos).toHaveLength(11);
    expect(JSON.stringify(importacion)).not.toContain('%PDF');
  });

  it('el mismo archivo dos veces: en revisión devuelve la misma; confirmado → ya_subido', async () => {
    const a = await analizarArchivo(repoMemoria, U, { nombre: 'a.pdf', datos: pdfs[0] });
    const b = await analizarArchivo(repoMemoria, U, { nombre: 'a.pdf', datos: pdfs[0] });
    expect(b.importacion.id).toBe(a.importacion.id);
    await confirmarImportaciones(repoMemoria, U, [{ id: a.importacion.id }]);
    const c = await analizarArchivo(repoMemoria, U, { nombre: 'a.pdf', datos: pdfs[0] });
    expect(c.codigo).toBe('ya_subido');
    expect((await repoMemoria.importaciones(U)).length).toBe(1);
  });

  it('archivo inválido queda en error con código', async () => {
    const { importacion, codigo } = await analizarArchivo(repoMemoria, U, { nombre: 'x.pdf', datos: Buffer.from('%PDF-1.4 nada') });
    expect(codigo).toBe('corrupto');
    expect(importacion).toMatchObject({ estado: 'error', error: 'corrupto' });
    expect(await descartarImportacion(repoMemoria, U, importacion.id)).toBe(true);
    expect((await repoMemoria.importacion(U, importacion.id))?.estado).toBe('descartado');
  });
});

describe('confirmarImportaciones (3 PDFs a la vez)', () => {
  it('une los periodos de la misma tarjeta, crea la de débito, y llena saldo, corte, límite, MSI, suscripciones y nómina', async () => {
    const ids: string[] = [];
    for (let i = 0; i < 3; i++) ids.push((await analizarArchivo(repoMemoria, U, { nombre: CASOS[i].archivo, datos: pdfs[i] })).importacion.id);

    const r = await confirmarImportaciones(repoMemoria, U, ids.map((id) => ({ id })));
    expect(r.resultados.every((x) => x.ok)).toBe(true);
    expect(r.totales.cuentas).toBe(2);
    expect(r.totales.movimientos).toBe(11 + 10 + 8);
    expect(r.totales.duplicados).toBe(0);

    const cuentas = await repoMemoria.cuentas(U);
    expect(cuentas).toHaveLength(2);
    const bbva = cuentas.find((c) => c.banco === 'BBVA')!;
    // El estado más reciente (agosto) manda en saldo, corte, límite de pago y pago mínimo.
    expect(bbva).toMatchObject({ tipo: 'credito', ultimos4: '0001', saldo: 20100, limite: 60000, pagoMinimo: 1350, fechaCorte: iso(CASOS[1].fechaCorte), fechaLimite: iso(CASOS[1].fechaLimite!) });
    const banorte = cuentas.find((c) => c.banco === 'Banorte')!;
    expect(banorte).toMatchObject({ tipo: 'debito', ultimos4: '0003', saldo: 23120 });

    const movs = await repoMemoria.movimientos(U);
    expect(movs.filter((m) => m.cuentaId === bbva.id)).toHaveLength(21);
    // Dos cargos idénticos el mismo día en el mismo estado se conservan.
    expect(movs.filter((m) => m.descripcionRaw === 'OXXO SUC 4521 CDMX' && m.fecha === iso(CASOS[1].movimientos[4].fecha))).toHaveLength(2);
    expect(movs.find((m) => m.descripcionRaw === 'SU PAGO GRACIAS')?.tipo).toBe('pago_tarjeta');
    expect(movs.find((m) => m.descripcionRaw.startsWith('REEMBOLSO'))).toMatchObject({ tipo: 'ingreso', categoriaId: 'ingreso' });
    expect(movs.filter((m) => m.categoriaId === 'nomina')).toHaveLength(2);

    const recs = (await repoMemoria.recurrentes(U)).filter((x) => x.activo);
    const nombres = recs.map((x) => x.nombre);
    expect(nombres).toEqual(expect.arrayContaining(['Netflix', 'Spotify', 'Amazon']));
    expect(recs.find((x) => x.nombre === 'Netflix')).toMatchObject({ tipo: 'suscripcion', veces: 2, monto: 249 });
    expect(recs.find((x) => x.nombre === 'Amazon')).toMatchObject({ tipo: 'msi', msiCuotasTotal: 6, msiCuotasPagadas: 3 });
    expect(r.totales.suscripciones).toBeGreaterThanOrEqual(2);
    expect(r.totales.msi).toBeGreaterThanOrEqual(1);

    expect(r.propuestaQuincena).toMatchObject({ dias: [14, 30], depositos: 2, ingresoQuincenal: 14500, esDistinta: true });
    expect((await repoMemoria.importaciones(U, { estados: ['confirmado'] })).length).toBe(3);
  });

  it('volver a confirmar un periodo ya guardado no duplica movimientos', async () => {
    const a = await analizarArchivo(repoMemoria, U, { nombre: 'a.pdf', datos: pdfs[1] });
    await confirmarImportaciones(repoMemoria, U, [{ id: a.importacion.id }]);
    const n1 = (await repoMemoria.movimientos(U)).length;
    // Mismo contenido con otro nombre de archivo (otro hash no; mismo hash → ya_subido). Simulamos traslape con un PDF distinto que repite movimientos.
    const traslape = await crearPdfEstado({ ...CASOS[1], archivo: 'traslape.pdf', periodoInicio: CASOS[1].movimientos[3].fecha, movimientos: CASOS[1].movimientos.slice(3) });
    const b = await analizarArchivo(repoMemoria, U, { nombre: 'traslape.pdf', datos: traslape });
    const r = await confirmarImportaciones(repoMemoria, U, [{ id: b.importacion.id }]);
    expect(r.resultados[0]).toMatchObject({ ok: true, insertados: 0, duplicados: 7 });
    expect((await repoMemoria.movimientos(U)).length).toBe(n1);
    expect((await repoMemoria.cuentas(U)).length).toBe(1);
  });
});
