import { describe, expect, it } from 'vitest';
import { casarRecibo, parsearRecibo } from './recibos';
import type { Movimiento } from '@/lib/domain/tipos';

const correo = (from: string, subject: string, text: string, fecha = '2026-09-10T18:00:00.000Z') => ({ from, subject, text, fecha });

describe('parsearRecibo', () => {
  it('Amazon: artículo, MSI y entrega', () => {
    const r = parsearRecibo(correo('"Amazon.com.mx" <pedido-actualizado@amazon.com.mx>', 'Tu pedido de "Secadora de Cabello Remington D3190" ha sido enviado', `Hola Ana,\n\nTu pedido ha sido enviado.\nLlega: jueves 12 de septiembre\n\nSecadora de Cabello Remington D3190 $1,299.00\n\nSubtotal: $1,299.00\nEnvío: $0.00\nTotal del pedido: $1,299.00\nPagado a 6 meses sin intereses\nNúmero de pedido: 702-1234567-8901234`));
    expect(r).toMatchObject({ comercio: 'Amazon', total: 1299, fecha: '2026-09-10' });
    expect(r?.detalle).toBe('Secadora de Cabello Remington D3190 · 1 de 6 MSI · llega jueves 12 de septiembre');
    expect(r?.meta.pedido).toBe('702-1234567-8901234');
  });

  it('Mercado Libre: artículo y entrega', () => {
    const r = parsearRecibo(correo('Mercado Libre <no-reply@mercadolibre.com.mx>', 'Compraste Audífonos Sony WH-CH520', 'Compraste Audífonos Sony WH-CH520 por $589.00\nTe llega el jueves\nVendedor: Tienda oficial Sony'));
    expect(r).toMatchObject({ comercio: 'Mercado Libre', total: 589 });
    expect(r?.detalle).toBe('Audífonos Sony WH-CH520 · llega jueves');
  });

  it('Uber: origen, destino y minutos', () => {
    const r = parsearRecibo(correo('Uber Receipts <noreply@uber.com>', 'Tu viaje del martes por la mañana con Uber', `Total $132.00\nGracias por viajar, Ana\n\n8:12 a. m.\nAv. Álvaro Obregón 120, Roma Norte, CDMX\n8:34 a. m.\nAv. Presidente Masaryk 111, Polanco, CDMX\n\nUberX 22 min · 6.8 km`));
    expect(r).toMatchObject({ comercio: 'Uber', total: 132 });
    expect(r?.detalle).toBe('Av. Álvaro Obregón 120 → Av. Presidente Masaryk 111 · 22 min');
  });

  it('Rappi: restaurante y artículos', () => {
    const r = parsearRecibo(correo('Rappi <pedidos@rappi.com.mx>', 'Tu pedido de Sushi Roll ya llegó', 'Tu pedido de Sushi Roll ya llegó\n\n1 x Roll California $138.00\n1 x Edamames $110.00\n\nTotal pagado: $248.00'));
    expect(r).toMatchObject({ comercio: 'Rappi', total: 248 });
    expect(r?.detalle).toBe('Sushi Roll · 2 artículos');
  });

  it('un correo sin total o de otro remitente no es recibo', () => {
    expect(parsearRecibo(correo('promo@amazon.com.mx', 'Ofertas de la semana', 'Hasta 40 % de descuento en electrónica'))).toBeNull();
    expect(parsearRecibo(correo('hola@netflix.com', 'Nuevo episodio', 'Ya está disponible'))).toBeNull();
  });
});

describe('casarRecibo', () => {
  const mov = (id: string, descripcionRaw: string, monto: number, fecha: string, tipo: Movimiento['tipo'] = 'gasto'): Movimiento =>
    ({ id, cuentaId: 'c', fecha, descripcionRaw, comercio: descripcionRaw, comercioDominio: null, categoriaId: 'online', categoriaFuente: 'regla', monto, tipo, esMsi: false, msiCuota: null, msiTotal: null, recurrenteId: null, fuente: 'import', hash: id }) as Movimiento;
  const recibo = parsearRecibo(correo('pedido-actualizado@amazon.com.mx', 'Tu pedido de "Secadora Remington"', 'Total del pedido: $1,299.00', '2026-09-10T18:00:00.000Z'))!;

  it('elige el cargo de Amazon con el mismo monto en la ventana de 3 días', () => {
    const c = casarRecibo(recibo, [mov('a', 'AMZN MKTP MX', 1299, '2026-09-11'), mov('b', 'AMAZON MX', 1299, '2026-09-30'), mov('c', 'OXXO', 1299, '2026-09-10'), mov('d', 'AMAZON MX', 1299.5, '2026-09-10')]);
    expect(c?.movimiento.id).toBe('a'); // monto exacto gana sobre el mismo día con 50 centavos de diferencia
    expect(c?.puntuacion).toBeGreaterThanOrEqual(0.6);
  });
  it('sin candidato compatible devuelve null', () => {
    expect(casarRecibo(recibo, [mov('x', 'AMAZON MX', 999, '2026-09-10'), mov('y', 'AMAZON MX', 1299, '2026-09-10', 'ingreso')])).toBeNull();
  });
});

describe('reciboDesdeLLM', () => {
  it('convierte la lectura del modelo al formato de los parsers y descarta lo incompleto', async () => {
    const { reciboDesdeLLM, pareceComercio } = await import('./recibos');
    const r = reciboDesdeLLM({ comercio: 'Liverpool', dominio: 'liverpool.com.mx', total: 2499.9, fecha: '2026-09-12', detalle: 'Tenis Nike Air · 6 MSI', articulos: ['Tenis Nike Air'], origen: null, destino: null, msi: 6, descriptores: ['LIVERPOOL', 'LPOOL'] }, '2026-09-13T10:00:00.000Z');
    expect(r).toMatchObject({ comercio: 'Liverpool', total: 2499.9, fecha: '2026-09-12', detalle: 'Tenis Nike Air · 6 MSI', descriptores: ['LIVERPOOL', 'LPOOL'], meta: { msi: 6 } });
    expect(reciboDesdeLLM({ comercio: null, dominio: null, total: 10, fecha: null, detalle: '', articulos: [], origen: null, destino: null, msi: null, descriptores: [] }, '2026-09-13T10:00:00.000Z')).toBeNull();
    expect(pareceComercio('alertas@bbva.mx')).toBe(false);
    expect(pareceComercio('ventas@liverpool.com.mx')).toBe(true);
  });
});
