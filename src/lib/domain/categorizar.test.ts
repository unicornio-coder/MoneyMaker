import { describe, expect, it } from 'vitest';
import { categorizar, detectarMsi, hashMovimiento, nombreLimpio, normalizar } from './categorizar';

const cargo = (descripcion: string, monto = 100) => ({ fecha: '2026-09-10', descripcion, monto, esAbono: false });
const abono = (descripcion: string, monto = 100) => ({ fecha: '2026-09-10', descripcion, monto, esAbono: true });

describe('normalizar', () => {
  it('quita acentos y ruido', () => {
    expect(normalizar('Cinépolis  Plaza Satélite #123')).toBe('CINEPOLIS PLAZA SATELITE 123');
  });
  it('nombreLimpio recorta basura bancaria', () => {
    expect(nombreLimpio('COMPRA TDC LA CASA DEL TACO SA DE CV RFC LCT9901 MEXICO')).toBe('La Casa Del');
    expect(nombreLimpio('REFRIGERADOR PARCIALIDAD 08/18')).toBe('Refrigerador');
  });
});

describe('detectarMsi', () => {
  it('lee cuota/total en varios formatos', () => {
    expect(detectarMsi('AMAZON MX MSI 02/06')).toEqual({ cuota: 2, total: 6 });
    expect(detectarMsi('LIVERPOOL CUOTA 5 DE 12')).toEqual({ cuota: 5, total: 12 });
    expect(detectarMsi('COPPEL PARCIALIDAD 9/18')).toEqual({ cuota: 9, total: 18 });
    expect(detectarMsi('SAMS 3 DE 6 MSI')).toEqual({ cuota: 3, total: 6 });
  });
  it('ignora fechas y números sueltos', () => {
    expect(detectarMsi('OXXO 10/09')).toBeNull();
    expect(detectarMsi('UBER 2 DE 3 PASAJEROS')).toBeNull();
  });
  it('MSI 1/1 es un pago único', () => {
    expect(detectarMsi('LIVERPOOL MSI 01/01')).toBeNull();
    expect(detectarMsi('LIVERPOOL MSI 01/03')).toEqual({ cuota: 1, total: 3 });
  });
});

describe('categorizar', () => {
  it('diccionario de comercios', () => {
    expect(categorizar(cargo('NETFLIX.COM 5551234567'))).toMatchObject({ comercio: 'Netflix', categoriaId: 'suscripciones', esSuscripcion: true, comercioDominio: 'netflix.com' });
    expect(categorizar(cargo('OXXO SUC 4521 CDMX'))).toMatchObject({ comercio: 'Oxxo', categoriaId: 'super' });
    expect(categorizar(cargo('UBER *EATS PENDING'))).toMatchObject({ comercio: 'Uber Eats', categoriaId: 'comida' });
    expect(categorizar(cargo('UBER *TRIP HELP.UBER.COM'))).toMatchObject({ comercio: 'Uber', categoriaId: 'transporte' });
    expect(categorizar(cargo('CFE SSB PAGO SERVICIO'))).toMatchObject({ comercio: 'CFE', categoriaId: 'servicios', esServicio: true });
    expect(categorizar(cargo('RAPPI RESTAURANTES CDMX'))).toMatchObject({ comercio: 'Rappi' });
    expect(categorizar(cargo('RESTAURANTE LA CASA'))).toMatchObject({ comercio: 'Restaurante', categoriaId: 'comida' });
  });

  it('MSI gana a la categoría del comercio', () => {
    const c = categorizar(cargo('AMAZON MX MSI 02/06', 650), 'credito');
    expect(c).toMatchObject({ comercio: 'Amazon', categoriaId: 'msi', esMsi: true, msiCuota: 2, msiTotal: 6 });
  });

  it('reglas bancarias', () => {
    expect(categorizar(abono('PAGO DE NOMINA EMPRESA SA', 14500))).toMatchObject({ categoriaId: 'nomina', tipo: 'ingreso' });
    expect(categorizar(abono('SPEI RECIBIDO BANORTE 0012345 JUAN PEREZ'))).toMatchObject({ categoriaId: 'transferencia', tipo: 'transferencia' });
    expect(categorizar(abono('SU PAGO GRACIAS', 6480), 'credito')).toMatchObject({ categoriaId: 'pago_tarjeta', tipo: 'pago_tarjeta' });
    expect(categorizar(cargo('PAGO TARJETA NU 7710', 6480), 'debito')).toMatchObject({ categoriaId: 'pago_tarjeta', tipo: 'pago_tarjeta' });
    expect(categorizar(cargo('COMISION ANUALIDAD TARJETA', 430), 'credito')).toMatchObject({ comercio: 'Anualidad', categoriaId: 'comisiones' });
    expect(categorizar(cargo('INTERESES DEL PERIODO', 264), 'credito')).toMatchObject({ categoriaId: 'comisiones' });
    expect(categorizar(cargo('RETIRO CAJERO ATM BBVA', 2000))).toMatchObject({ categoriaId: 'efectivo' });
    expect(categorizar(cargo('SPEI ENVIADO GBM APORTACION', 3000))).toMatchObject({ categoriaId: 'inversion', tipo: 'transferencia' });
    expect(categorizar(cargo('COMPRA BTC', 2000), 'inversion')).toMatchObject({ categoriaId: 'inversion', tipo: 'transferencia' });
    expect(categorizar(abono('RENDIMIENTO CETES', 1040), 'inversion')).toMatchObject({ categoriaId: 'rendimiento', tipo: 'ingreso' });
  });

  it('desconocido cae a proveedor o queda para el LLM', () => {
    expect(categorizar({ ...cargo('XYZ COMERCIO RARO'), categoriaProveedor: 'Restaurants' })).toMatchObject({ categoriaId: 'comida', categoriaFuente: 'proveedor', desconocido: false });
    expect(categorizar(cargo('XYZ COMERCIO RARO'))).toMatchObject({ categoriaId: 'otros', desconocido: true, comercio: 'Xyz Comercio Raro' });
  });

  it('reembolso en tarjeta de crédito no es pago ni gasto', () => {
    expect(categorizar(abono('REEMBOLSO AMAZON MX', 450), 'credito')).toMatchObject({ categoriaId: 'ingreso', tipo: 'ingreso', comercio: 'Reembolso Amazon' });
    expect(categorizar(abono('DEVOLUCION COMPRA', 450), 'credito')).toMatchObject({ categoriaId: 'ingreso', tipo: 'ingreso' });
  });

  it('palabras clave del catálogo de Producto (categorias.json)', () => {
    expect(categorizar(cargo('CINEPOLIS PERISUR'))).toMatchObject({ categoriaId: 'entretenimiento' });
    expect(categorizar(cargo('HOME DEPOT MEXICO'))).toMatchObject({ categoriaId: 'hogar' });
    expect(categorizar(cargo('AEROMEXICO 1234'))).toMatchObject({ categoriaId: 'viajes' });
  });

  it('la IA marcó posible suscripción y nadie más la reconoce', () => {
    expect(categorizar({ ...cargo('GIMNASIO DEL VALLE', 650), esPosibleSuscripcion: true })).toMatchObject({ categoriaId: 'suscripciones', esSuscripcion: true, desconocido: true });
  });

  it('MSI ya separado por la fuente gana al texto', () => {
    expect(categorizar({ ...cargo('LIVERPOOL', 1000), msi: { cuota: 3, total: 12 } }, 'credito')).toMatchObject({ categoriaId: 'msi', esMsi: true, msiCuota: 3, msiTotal: 12 });
  });

  it('hash estable e insensible a formato', () => {
    const a = hashMovimiento('c1', '2026-09-10', 'Oxxo  Suc 4521', 188, false);
    const b = hashMovimiento('c1', '2026-09-10T00:00:00Z', 'OXXO SUC 4521', 188.0, false);
    expect(a).toBe(b);
    expect(hashMovimiento('c1', '2026-09-10', 'OXXO SUC 4521', 189, false)).not.toBe(a);
  });
});
