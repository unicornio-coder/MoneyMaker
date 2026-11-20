import { describe, expect, it } from 'vitest';
import { rutaSegura } from './ruta';

describe('a dónde se manda al usuario después de entrar', () => {
  it('acepta rutas internas, con todo y parámetros', () => {
    expect(rutaSegura('/app')).toBe('/app');
    expect(rutaSegura('/app/importar?desde=onboarding')).toBe('/app/importar?desde=onboarding');
    expect(rutaSegura('/restablecer')).toBe('/restablecer');
  });

  it('rechaza cualquier cosa que saque al usuario de la app', () => {
    expect(rutaSegura('https://sitio-falso.com')).toBe('/app');
    expect(rutaSegura('//sitio-falso.com')).toBe('/app');
    expect(rutaSegura('/\\sitio-falso.com')).toBe('/app');
    expect(rutaSegura('javascript:alert(1)')).toBe('/app');
    expect(rutaSegura('app')).toBe('/app');
  });

  it('sin valor, o con algo que no es texto, usa la ruta por defecto', () => {
    expect(rutaSegura(null)).toBe('/app');
    expect(rutaSegura(undefined)).toBe('/app');
    expect(rutaSegura('')).toBe('/app');
    expect(rutaSegura(42, '/inicio')).toBe('/inicio');
  });
});
