import { describe, expect, it } from 'vitest';
import { parsearAlerta } from './gmail.parsers';

const F = '2026-09-10T15:00:00Z';

describe('parsearAlerta', () => {
  it('BBVA compra con tarjeta de débito', () => {
    const r = parsearAlerta({ from: 'BBVA <bbva@bbva.mx>', subject: 'Compra realizada con tu tarjeta', text: 'Hola Juan. Realizaste una compra por $1,238.00 MXN en SORIANA HIPER con tu tarjeta de débito terminación 4821 el 08/09/2026 a las 18:22.', fecha: F });
    expect(r).toMatchObject({ banco: 'BBVA', tipoCuenta: 'debito', ultimos4: '4821', movimiento: { fecha: '2026-09-08', descripcion: 'SORIANA HIPER', monto: 1238, esAbono: false } });
  });

  it('Amex compra aprobada', () => {
    const r = parsearAlerta({ from: 'American Express <alertas@americanexpress.com>', subject: 'Alerta de compra aprobada', text: 'Se aprobó una compra de $450.00 MXN en GASOLINA BP con tu Tarjeta terminación 1004.', fecha: F });
    expect(r).toMatchObject({ banco: 'Amex', tipoCuenta: 'credito', ultimos4: '1004', movimiento: { descripcion: 'GASOLINA BP', monto: 450, esAbono: false, fecha: '2026-09-10' } });
  });

  it('Nu compra', () => {
    const r = parsearAlerta({ from: 'Nu <no-reply@nu.com.mx>', subject: 'Compra aprobada: $318.00 en Rappi', text: 'Usaste tu tarjeta Nu terminación 7710 en Rappi por $318.00.', fecha: F });
    expect(r).toMatchObject({ banco: 'Nu', tipoCuenta: 'credito', ultimos4: '7710', movimiento: { descripcion: 'Rappi', monto: 318 } });
  });

  it('abono / depósito de nómina', () => {
    const r = parsearAlerta({ from: 'BBVA <bbva@bbva.mx>', subject: 'Abono a tu cuenta', text: 'Recibiste un depósito por $14,500.00 en tu cuenta terminación 4821. Concepto: NOMINA EMPRESA SA.', fecha: F });
    expect(r?.movimiento.esAbono).toBe(true);
    expect(r?.movimiento.monto).toBe(14500);
  });

  it('ignora rechazos, promociones y remitentes desconocidos', () => {
    expect(parsearAlerta({ from: 'BBVA <bbva@bbva.mx>', subject: 'Compra rechazada', text: 'Tu compra por $500.00 en AMAZON fue rechazada.', fecha: F })).toBeNull();
    expect(parsearAlerta({ from: 'Banorte <promo@banorte.com>', subject: 'Promoción: 12 meses sin intereses en Liverpool', text: 'Aprovecha $1,000 de bono…', fecha: F })).toBeNull();
    expect(parsearAlerta({ from: 'tienda@shein.com', subject: 'Tu pedido', text: 'Total $560.00', fecha: F })).toBeNull();
  });
});
