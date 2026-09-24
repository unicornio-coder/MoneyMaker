import { beforeEach, describe, expect, it } from 'vitest';
import { repoMemoria, reiniciarMemoria } from '@/lib/data/repo.memoria';
import { aplicarRecibos, casarRecibosPendientes } from './enriquecer';
import { ingerirMovimientos } from './ingest';
import { parsearRecibo } from './recibos';
import { aISO, sumarDias } from '@/lib/domain/fechas';

const U = 'user-recibos';
const hoy = new Date();
const d = (n: number) => aISO(sumarDias(hoy, -n));

describe('enriquecer: recibos ↔ movimientos', () => {
  beforeEach(async () => {
    reiniciarMemoria();
    await repoMemoria.guardarPerfil(U, { email: 'r@billup.mx' });
    await repoMemoria.guardarCredencial(U, { proveedor: 'gmail', etiqueta: 'r@gmail.com', datos: { refresh_token: 'x' } });
  });

  it('un recibo de Amazon escribe el detalle en el cargo de Amazon del banco; el de Uber espera a que llegue el cargo', async () => {
    const link = await repoMemoria.guardarLink(U, { proveedor: 'import', externalId: 'imp', institucion: 'BBVA', institucionDominio: 'bbva.mx', estado: 'ok', ultimoSync: null });
    const cuenta = await repoMemoria.guardarCuenta(U, { linkId: link.id, externalId: 'c1', nombre: 'BBVA Crédito', banco: 'BBVA', bancoDominio: 'bbva.mx', tipo: 'credito', ultimos4: '0001', saldo: 0, color: '#072146', activo: true });
    await ingerirMovimientos(repoMemoria, U, cuenta, [{ fecha: d(2), descripcion: 'AMZN MKTP MX', monto: 1299, esAbono: false }, { fecha: d(2), descripcion: 'OXXO', monto: 85, esAbono: false }], 'import');

    const amazon = parsearRecibo({ from: 'pedido-actualizado@amazon.com.mx', subject: 'Tu pedido de "Secadora Remington"', text: 'Total del pedido: $1,299.00\nPagado a 6 meses sin intereses', fecha: `${d(2)}T12:00:00.000Z` })!;
    const uber = parsearRecibo({ from: 'noreply@uber.com', subject: 'Tu viaje con Uber', text: 'Total $132.00\nGracias por viajar\n8:12 a. m.\nRoma Norte, CDMX\n8:34 a. m.\nPolanco, CDMX\n22 min', fecha: `${d(1)}T12:00:00.000Z` })!;
    const r = await aplicarRecibos(repoMemoria, U, [amazon, uber]);
    expect(r).toEqual({ casados: 1, pendientes: 1 });

    const movs = await repoMemoria.movimientos(U);
    expect(movs.find((m) => m.descripcionRaw === 'AMZN MKTP MX')).toMatchObject({ detalle: 'Secadora Remington · 1 de 6 MSI', recibo: { comercio: 'Amazon', msi: 6 } });
    expect(movs.find((m) => m.descripcionRaw === 'OXXO')?.detalle).toBeUndefined();

    // Llega el estado de cuenta con el cargo de Uber: el recibo pendiente se casa solo.
    await ingerirMovimientos(repoMemoria, U, cuenta, [{ fecha: d(1), descripcion: 'UBER *TRIP HELP.UBER.COM', monto: 132, esAbono: false }], 'import');
    expect(await casarRecibosPendientes(repoMemoria, U)).toBe(1);
    expect((await repoMemoria.movimientos(U)).find((m) => m.descripcionRaw.startsWith('UBER'))?.detalle).toBe('Roma Norte → Polanco · 22 min');
    const cred = await repoMemoria.credencial(U, 'gmail');
    expect((cred?.datos.recibosPendientes as unknown[]).length).toBe(0);
  });
});
