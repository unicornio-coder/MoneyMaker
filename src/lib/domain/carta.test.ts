import { describe, expect, it } from 'vitest';
import { cartaCancelacion } from './carta';

describe('carta de cancelación', () => {
  it('identifica al titular, cita la LFPC y pide confirmación por escrito', () => {
    const c = cartaCancelacion({ servicio: 'Netflix', titular: 'Juan Carlos Ostos', correo: 'jc@billup.mx', ultimos4: '4421', montoMensual: 249, fecha: '2026-09-24', notas: 'Plan estándar' });
    expect(c.titulo).toBe('Solicitud de cancelación de Netflix');
    expect(c.encabezado[0]).toBe('24 de septiembre de 2026');
    expect(c.parrafos[0]).toContain('correo jc@billup.mx y tarjeta con terminación 4421');
    expect(c.parrafos[1]).toContain('artículos 7, 56 y 76 bis de la Ley Federal de Protección al Consumidor');
    expect(c.parrafos[2]).toContain('al correo jc@billup.mx');
    expect(c.parrafos[3]).toContain('$249 MXN al mes');
    expect(c.parrafos[4]).toBe('Notas adicionales: Plan estándar');
    expect(c.cierre).toEqual(['Atentamente,', 'Juan Carlos Ostos']);
  });

  it('sin correo, tarjeta ni monto no deja huecos en el texto', () => {
    const c = cartaCancelacion({ servicio: 'Smart Fit', titular: 'Ana', correo: null, ultimos4: null, montoMensual: null, fecha: '2026-01-05' });
    expect(c.parrafos[0]).toBe('Por este medio solicito la cancelación definitiva del servicio Smart Fit contratado a mi nombre, con efectos a partir de la fecha de esta carta.');
    expect(c.parrafos[3]).not.toContain('(');
    expect(c.parrafos).toHaveLength(4);
  });
});

describe('negociación', () => {
  it('carta con competencia, guion y comisión del 25 % del ahorro anual', async () => {
    const { cartaNegociacion, guionNegociacion, resultadoNegociacion } = await import('./carta');
    const c = cartaNegociacion({ servicio: 'Totalplay', titular: 'Ana', correo: 'ana@billup.mx', numeroCuenta: '12345', precioActual: 899, ofertaCompetencia: { proveedor: 'Izzi', precio: 599 }, antiguedadMeses: 14, fecha: '2026-09-24' });
    expect(c.titulo).toBe('Solicitud de mejor tarifa a Totalplay');
    expect(c.parrafos[0]).toContain('desde hace 14 meses');
    expect(c.parrafos[1]).toContain('Izzi me ofrece un servicio equivalente por $599 MXN');
    expect(guionNegociacion({ servicio: 'Totalplay', precioActual: 899, ofertaCompetencia: { proveedor: 'Izzi', precio: 599 } })[1]).toBe('Izzi me da lo mismo por $599 MXN. ¿Lo igualan?');
    expect(resultadoNegociacion(899, 649)).toEqual({ ahorroAnual: 3000, comision: 750 });
    expect(resultadoNegociacion(899, 899)).toEqual({ ahorroAnual: 0, comision: 0 });
  });
});
