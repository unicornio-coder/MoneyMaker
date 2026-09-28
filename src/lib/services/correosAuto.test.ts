import { describe, expect, it } from 'vitest';
import { correoBienvenida, correoConectaBanco } from './correosAuto';

describe('correos automáticos', () => {
  it('bienvenida con nombre, enlace al panel y sin rojo', () => {
    const c = correoBienvenida({ email: 'a@b.mx', nombre: 'Juan Carlos' }, 'https://app.test');
    expect(c.asunto).toBe('Bienvenido a MoneyMaker');
    expect(c.texto).toContain('Hola Juan.');
    expect(c.texto).toContain('https://app.test/app');
    expect(c.html).toContain('Ir a mi panel');
    expect(c.html).not.toMatch(/#(ff0000|dc2626|ef4444)/i);
  });
  it('conecta tu banco escapa el HTML y funciona sin nombre', () => {
    const c = correoConectaBanco({ email: 'a@b.mx', nombre: '<b>x</b>' }, 'https://app.test');
    expect(c.html).toContain('&lt;b&gt;x&lt;/b&gt;');
    const sin = correoConectaBanco({ email: 'a@b.mx', nombre: null }, 'https://app.test');
    expect(sin.texto.startsWith('Todavía')).toBe(true);
  });
});
