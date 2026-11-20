import { describe, expect, it } from 'vitest';
import { correoValido } from './correo';

describe('correo del proveedor para una carta', () => {
  it('acepta un correo normal y lo deja en minúsculas', () => {
    expect(correoValido(' Atencion@Proveedor.com.mx ')).toBe('atencion@proveedor.com.mx');
  });

  it('rechaza varios destinatarios, cabeceras escondidas y textos que no son correo', () => {
    expect(correoValido('a@x.com, b@y.com')).toBeNull();
    expect(correoValido('a@x.com;b@y.com')).toBeNull();
    expect(correoValido('a@x.com\nBcc: todos@lista.com')).toBeNull();
    expect(correoValido('Nombre <a@x.com>')).toBeNull();
    expect(correoValido('sin-arroba.com')).toBeNull();
    expect(correoValido('a@sin-dominio')).toBeNull();
    expect(correoValido(`${'a'.repeat(130)}@x.com`)).toBeNull();
  });

  it('vacío o sin valor no es un correo', () => {
    expect(correoValido('')).toBeNull();
    expect(correoValido(null)).toBeNull();
    expect(correoValido(undefined)).toBeNull();
  });
});
