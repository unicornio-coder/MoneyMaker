import { beforeEach, describe, expect, it } from 'vitest';
import { repoMemoria, reiniciarMemoria } from '@/lib/data/repo.memoria';
import { aliasCorreo, crearTokenDispositivo, notificacionACorreo, procesarEntrada, usuarioPorAlias, usuarioPorToken } from './entrada';

const U = 'user-entrada';

describe('entrada por notificación y correo reenviado', () => {
  beforeEach(async () => {
    reiniciarMemoria();
    await repoMemoria.guardarPerfil(U, { email: 'e@billup.mx' });
  });

  it('token de dispositivo: se crea, identifica al usuario y uno inventado no', async () => {
    const token = await crearTokenDispositivo(repoMemoria, U);
    expect(token).toMatch(/^mmd_[a-f0-9]{48}$/);
    expect(await usuarioPorToken(repoMemoria, token)).toBe(U);
    expect(await usuarioPorToken(repoMemoria, 'mmd_' + '0'.repeat(48))).toBeNull();
    expect(await usuarioPorToken(repoMemoria, 'nada')).toBeNull();
    // Crear otro invalida el anterior.
    const otro = await crearTokenDispositivo(repoMemoria, U);
    expect(await usuarioPorToken(repoMemoria, token)).toBeNull();
    expect(await usuarioPorToken(repoMemoria, otro)).toBe(U);
  });

  it('alias de correo: estable por usuario', async () => {
    const a = await aliasCorreo(repoMemoria, U);
    expect(a).toMatch(/^mm-[a-f0-9]{10}$/);
    expect(await aliasCorreo(repoMemoria, U)).toBe(a);
    expect(await usuarioPorAlias(repoMemoria, a)).toBe(U);
  });

  it('una notificación de BBVA crea el movimiento en la cuenta correcta; repetida no duplica', async () => {
    const correo = notificacionACorreo({ paquete: 'com.bbva.mx', titulo: 'Compra realizada', texto: 'Compra por $348.00 en OXXO SUC 4521 con tu tarjeta de crédito terminación 0001 el 10/09/2026.', hora: '2026-09-10T15:00:00.000Z' })!;
    const r = await procesarEntrada(repoMemoria, U, correo, 'dispositivo');
    expect(r).toMatchObject({ tipo: 'movimiento', insertados: 1 });
    const cuentas = await repoMemoria.cuentas(U);
    expect(cuentas).toHaveLength(1);
    expect(cuentas[0]).toMatchObject({ banco: 'BBVA', tipo: 'credito', ultimos4: '0001' });
    const movs = await repoMemoria.movimientos(U);
    expect(movs[0]).toMatchObject({ monto: 348, fuente: 'dispositivo', fecha: '2026-09-10' });
    expect(await procesarEntrada(repoMemoria, U, correo, 'dispositivo')).toMatchObject({ tipo: 'movimiento', insertados: 0, duplicados: 1 });
  });

  it('un recibo de Amazon reenviado enriquece el cargo; una app desconocida se ignora', async () => {
    const alerta = notificacionACorreo({ paquete: 'com.nu.production', titulo: 'Compra aprobada', texto: 'Compra de $1,299.00 en AMZN MKTP MX con tu tarjeta terminación 4421.', hora: '2026-09-10T15:00:00.000Z' })!;
    await procesarEntrada(repoMemoria, U, alerta, 'dispositivo');
    const r = await procesarEntrada(repoMemoria, U, { from: 'pedido-actualizado@amazon.com.mx', subject: 'Tu pedido de "Secadora Remington"', text: 'Total del pedido: $1,299.00', fecha: '2026-09-10T18:00:00.000Z' }, 'correo');
    expect(r).toEqual({ tipo: 'recibo', casados: 1 });
    expect((await repoMemoria.movimientos(U))[0].detalle).toBe('Secadora Remington');
    expect(notificacionACorreo({ paquete: 'com.whatsapp', titulo: 'Hola', texto: 'x' })).toBeNull();
  });
});
