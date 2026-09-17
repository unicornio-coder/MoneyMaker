import { describe, expect, it } from 'vitest';
import { createHmac } from 'node:crypto';
import { firmar } from './bitso';

describe('firma Bitso', () => {
  it('HMAC-SHA256 de nonce+método+ruta con el formato de cabecera', () => {
    const h = firmar('KEY', 'SECRET', 'GET', '/v3/balance/', '', 1700000000000);
    const esperado = createHmac('sha256', 'SECRET').update('1700000000000GET/v3/balance/').digest('hex');
    expect(h).toBe(`Bitso KEY:1700000000000:${esperado}`);
  });
});
