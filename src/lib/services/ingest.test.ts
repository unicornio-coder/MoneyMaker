import { beforeEach, describe, expect, it } from 'vitest';
import { repoMemoria, reiniciarMemoria } from '@/lib/data/repo.memoria';
import { conectarLink } from './conectar';
import { ingerirMovimientos } from './ingest';

const U = 'user-test';

describe('pipeline de ingesta (memoria + agregador mock)', () => {
  beforeEach(() => reiniciarMemoria());

  it('conecta un banco mock, guarda cuentas, categoriza y detecta recurrentes', async () => {
    await repoMemoria.guardarPerfil(U, { email: 'a@b.mx', diasPago: [5, 20] });
    const r = await conectarLink(repoMemoria, U, 'nu_mx_retail', 'Nu');
    expect(r.ok).toBe(true);
    const cuentas = await repoMemoria.cuentas(U);
    expect(cuentas).toHaveLength(1);
    expect(cuentas[0]).toMatchObject({ banco: 'Nu', tipo: 'credito', ultimos4: '7710' });

    const movs = await repoMemoria.movimientos(U);
    expect(movs.length).toBeGreaterThan(30);
    const netflix = movs.find((m) => m.comercio === 'Netflix');
    expect(netflix).toMatchObject({ categoriaId: 'suscripciones', tipo: 'gasto' });
    const pago = movs.find((m) => m.descripcionRaw === 'SU PAGO GRACIAS');
    expect(pago?.tipo).toBe('pago_tarjeta');
    const msi = movs.find((m) => m.esMsi);
    expect(msi).toMatchObject({ comercio: 'Amazon', categoriaId: 'msi', msiTotal: 6 });

    const recs = await repoMemoria.recurrentes(U);
    const nombres = recs.filter((x) => x.activo).map((x) => x.nombre);
    expect(nombres).toEqual(expect.arrayContaining(['Netflix', 'Spotify', 'Amazon']));
    const amazon = recs.find((x) => x.nombre === 'Amazon');
    expect(amazon).toMatchObject({ tipo: 'msi', msiCuotasTotal: 6 });
    expect(movs.filter((m) => m.recurrenteId).length).toBeGreaterThan(3);

    const insights = await repoMemoria.insights(U);
    expect(insights.length).toBeGreaterThan(0);
  });

  it('la segunda sincronización no duplica', async () => {
    await repoMemoria.guardarPerfil(U, { email: 'a@b.mx' });
    await conectarLink(repoMemoria, U, 'bbva_mx_retail', 'BBVA');
    const n1 = (await repoMemoria.movimientos(U)).length;
    const r2 = await conectarLink(repoMemoria, U, 'bbva_mx_retail', 'BBVA');
    expect(r2.ok && r2.insertados).toBe(0);
    expect((await repoMemoria.movimientos(U)).length).toBe(n1);
    expect((await repoMemoria.cuentas(U)).length).toBe(1);
    expect((await repoMemoria.links(U)).length).toBe(1);
  });

  it('las correcciones del usuario ganan a las reglas', async () => {
    await repoMemoria.guardarPerfil(U, { email: 'a@b.mx' });
    const cuenta = await repoMemoria.guardarCuenta(U, { nombre: 'Efectivo', banco: 'Efectivo', tipo: 'efectivo', saldo: 0, activo: true });
    await repoMemoria.guardarCorreccionComercio(U, { patron: 'OXXO', nombre: 'Oxxo', dominio: 'oxxo.com', categoriaId: 'comida', esSuscripcion: false });
    await ingerirMovimientos(repoMemoria, U, cuenta, [{ fecha: '2026-09-10', descripcion: 'OXXO SUC 1', monto: 50, esAbono: false }], 'manual');
    const [m] = await repoMemoria.movimientos(U);
    expect(m).toMatchObject({ categoriaId: 'comida', categoriaFuente: 'usuario' });
  });
});
