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
