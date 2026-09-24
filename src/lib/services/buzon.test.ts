import { beforeEach, describe, expect, it } from 'vitest';
import { repoMemoria, reiniciarMemoria } from '@/lib/data/repo.memoria';
import { ingerirCorreos, limpiarHtml, remitenteRelevante } from './buzon';

const U = 'user-buzon';

describe('buzón (Gmail y Outlook comparten la ingesta)', () => {
  beforeEach(async () => {
    reiniciarMemoria();
    await repoMemoria.guardarPerfil(U, { email: 'e@billup.mx' });
  });

  it('solo descarga remitentes de bancos y comercios con recibo', () => {
    expect(remitenteRelevante('BBVA <alertas@bbva.mx>')).toBe(true);
    expect(remitenteRelevante('Amazon.com.mx <pedido-actualizado@amazon.com.mx>')).toBe(true);
    expect(remitenteRelevante('Alertas <no-reply@notificaciones.bbva.mx>')).toBe(true);
    expect(remitenteRelevante('Ofertas <hola@tiendarandom.mx>')).toBe(false);
    expect(remitenteRelevante('sin correo')).toBe(false);
  });

  it('limpia HTML sin dejar estilos ni entidades', () => {
    expect(limpiarHtml('<style>p{color:red}</style><p>Compra por <b>$348.00</b>&nbsp;en OXXO &amp; CIA</p>')).toBe('Compra por $348.00 en OXXO & CIA');
  });

  it('alertas → cuenta y movimientos; recibo → detalle; lo demás se ignora', async () => {
    const link = await repoMemoria.guardarLink(U, { proveedor: 'outlook', externalId: 'jc@outlook.com', institucion: 'Outlook', institucionDominio: 'outlook.com', estado: 'pendiente', ultimoSync: null });
    const r = await ingerirCorreos(repoMemoria, U, link, [
      { from: 'BBVA <alertas@bbva.mx>', subject: 'Compra realizada', text: 'Compra por $348.00 en OXXO SUC 4521 con tu tarjeta de crédito terminación 0001 el 10/09/2026.', fecha: '2026-09-10T15:00:00.000Z' },
      { from: 'BBVA <alertas@bbva.mx>', subject: 'Compra realizada', text: 'Compra por $1,299.00 en AMZN MKTP MX con tu tarjeta de crédito terminación 0001 el 11/09/2026.', fecha: '2026-09-11T15:00:00.000Z' },
      { from: 'Amazon.com.mx <pedido-actualizado@amazon.com.mx>', subject: 'Tu pedido de "Secadora Remington"', text: 'Total del pedido: $1,299.00', fecha: '2026-09-11T18:00:00.000Z' },
      { from: 'Alguien <hola@tiendarandom.mx>', subject: 'Promo', text: 'Descuentos', fecha: '2026-09-11T18:00:00.000Z' },
    ], 'outlook');
    expect(r).toEqual({ insertados: 2, recibos: 1, ignorados: 1 });
    const cuentas = await repoMemoria.cuentas(U);
    expect(cuentas).toHaveLength(1);
    expect(cuentas[0]).toMatchObject({ banco: 'BBVA', tipo: 'credito', ultimos4: '0001', linkId: link.id });
    const movs = await repoMemoria.movimientos(U);
    expect(movs.map((m) => m.fuente)).toEqual(['outlook', 'outlook']);
    expect(movs.find((m) => m.monto === 1299)?.detalle).toBe('Secadora Remington');
  });
});
