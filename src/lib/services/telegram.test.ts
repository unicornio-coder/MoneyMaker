import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { crearCodigoVinculo, leerCodigoVinculo, responderPregunta, secretoWebhook } from './telegram';
import type { DatosBot } from '@/lib/domain/telegram';

const USUARIO = '3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b';
const AHORA = Date.UTC(2026, 10, 11, 18, 0, 0);

describe('vinculación del chat de Telegram', () => {
  const previo = { token: process.env.TELEGRAM_BOT_TOKEN, llave: process.env.ANTHROPIC_API_KEY };
  beforeEach(() => {
    process.env.TELEGRAM_BOT_TOKEN = '123456:PRUEBA';
    delete process.env.ANTHROPIC_API_KEY;
  });
  afterEach(() => {
    if (previo.token === undefined) delete process.env.TELEGRAM_BOT_TOKEN;
    else process.env.TELEGRAM_BOT_TOKEN = previo.token;
    if (previo.llave !== undefined) process.env.ANTHROPIC_API_KEY = previo.llave;
  });

  it('el código cabe en el parámetro start de Telegram y regresa al mismo usuario', () => {
    const codigo = crearCodigoVinculo(USUARIO, AHORA)!;
    expect(codigo).toMatch(/^[A-Za-z0-9_-]{1,64}$/);
    expect(leerCodigoVinculo(codigo, AHORA + 60_000)).toBe(USUARIO);
  });

  it('vence a los 15 minutos', () => {
    const codigo = crearCodigoVinculo(USUARIO, AHORA)!;
    expect(leerCodigoVinculo(codigo, AHORA + 16 * 60_000)).toBeNull();
  });

  it('rechaza un código alterado o firmado con otro token', () => {
    const codigo = crearCodigoVinculo(USUARIO, AHORA)!;
    const alterado = (codigo[0] === 'A' ? 'B' : 'A') + codigo.slice(1);
    expect(leerCodigoVinculo(alterado, AHORA)).toBeNull();
    process.env.TELEGRAM_BOT_TOKEN = '999999:OTRO';
    expect(leerCodigoVinculo(codigo, AHORA)).toBeNull();
    expect(leerCodigoVinculo('hola', AHORA)).toBeNull();
  });

  it('no arma código para un id que no es de Supabase', () => {
    expect(crearCodigoVinculo('demo', AHORA)).toBeNull();
  });

  it('el secreto del webhook solo usa caracteres que acepta Telegram', () => {
    expect(secretoWebhook()).toMatch(/^[A-Za-z0-9_-]{1,256}$/);
  });

  it('sin modelo contesta con la redacción fija y las cifras de la app', async () => {
    const datos: DatosBot = { hayDatos: true, periodo: '1 – 15 nov', diasRestantes: 4, proximoPago: '2026-11-15', limite: 9000, gastado: 6150, teQueda: 2850, porDia: 713, suscripciones: [{ nombre: 'Netflix', mensual: 249 }], totalSuscripciones: 249, totalSuscripcionesAnual: 2988, proximosCobros: [], totalProximosCobros: 0 };
    const r = await responderPregunta('¿Cuánto me queda?', datos);
    expect(r.origen).toBe('reglas');
    expect(r.intencion).toBe('queda');
    expect(r.texto).toContain('$2,850');
  });
});
