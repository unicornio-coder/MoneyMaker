import { describe, expect, it } from 'vitest';
import { enviarPush, pushConfigurado } from './push';

describe('push', () => {
  it('sin llaves VAPID no manda nada', async () => {
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
    expect(pushConfigurado()).toBe(false);
    expect(await enviarPush({ endpoint: 'https://x', p256dh: 'a', auth: 'b' }, { titulo: 't', cuerpo: 'c' })).toEqual({ ok: false, error: 'no_configurado' });
  });
});
