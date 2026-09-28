import { describe, expect, it } from 'vitest';
import { asuntoResumen, htmlResumen, textoResumen } from './resumen';
import { resumenSemanal } from '@/lib/domain/resumen';
import type { Movimiento, Recurrente } from '@/lib/domain/tipos';

const HOY = new Date(2026, 8, 27);
const mov = (fecha: string, monto: number, comercio: string, categoriaId = 'comida'): Movimiento => ({ id: fecha + monto, cuentaId: 'c', fecha, descripcionRaw: comercio, comercio, monto, tipo: 'gasto', categoriaId, categoriaFuente: 'regla', esMsi: false, fuente: 'manual', hash: fecha + monto });
const rec: Recurrente = { id: 'n', nombre: 'Netflix', tipo: 'suscripcion', monto: 219, diaCobro: 30, frecuencia: 'mensual', veces: 3, activo: true, origen: 'detectado', ultimoCargo: '2026-08-30' };

describe('correo del domingo', () => {
  const r = resumenSemanal([mov('2026-09-22', 1250, 'Uber <Viaje>', 'transporte'), mov('2026-09-25', 300, 'Oxxo')], [rec], HOY);
  it('asunto con el gasto', () => {
    expect(asuntoResumen(r)).toBe('Tu semana: gastaste $1,550');
  });
  it('texto con gasto, categorías, mayor gasto, próximos cobros y enlaces', () => {
    const t = textoResumen(r, 'Juan', 'https://app.test');
    expect(t).toContain('Hola Juan.');
    expect(t).toContain('Gasto de la semana: $1,550 en 2 movimientos.');
    expect(t).toContain('Transporte $1,250');
    expect(t).toContain('Tu mayor gasto: Uber <Viaje>, $1,250');
    expect(t).toContain('Netflix · $219');
    expect(t).toContain('https://app.test/app/ajustes?sec=notificaciones');
  });
  it('html escapa el contenido y usa la paleta', () => {
    const h = htmlResumen(r, null, 'https://app.test');
    expect(h).toContain('Uber &lt;Viaje&gt;');
    expect(h).toContain('#2563EB');
    expect(h).not.toMatch(/#(ff0000|dc2626|ef4444)/i);
    expect(h).toContain('Ver mi panel');
  });
});
