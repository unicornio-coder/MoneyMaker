import { describe, expect, it } from 'vitest';
import { correoConfigurado, enviarCorreo } from './correo';

describe('correo (Resend)', () => {
  it('sin llave no manda nada y lo dice', async () => {
    delete process.env.RESEND_API_KEY;
    expect(correoConfigurado()).toBe(false);
    expect(await enviarCorreo({ para: 'x@billup.mx', asunto: 'Hola', texto: 'Prueba' })).toEqual({ ok: false, error: 'no_configurado' });
  });
});
