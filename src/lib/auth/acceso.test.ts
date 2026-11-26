import { describe, expect, it } from 'vitest';
import { decidirAcceso, esCorreoRegistrado, limpiarNombre, motivoFallaEntrada, nombreValido, normalizarCorreo } from './acceso';

describe('qué pasa al presionar "Continuar"', () => {
  it('si la contraseña coincide, entra (traiga o no nombre)', () => {
    expect(decidirAcceso({ entró: true, existe: true, traeNombre: false })).toBe('entrar');
    expect(decidirAcceso({ entró: true, existe: false, traeNombre: true })).toBe('entrar');
  });

  it('si la cuenta existe y no entró, es la contraseña: nunca se crea otra cuenta', () => {
    expect(decidirAcceso({ entró: false, existe: true, traeNombre: false })).toBe('contraseña');
    expect(decidirAcceso({ entró: false, existe: true, traeNombre: true })).toBe('contraseña');
  });

  it('si la cuenta no existe, primero pide el nombre y luego la crea', () => {
    expect(decidirAcceso({ entró: false, existe: false, traeNombre: false })).toBe('pedir-nombre');
    expect(decidirAcceso({ entró: false, existe: false, traeNombre: true })).toBe('crear');
  });
});

describe('por qué no pudo entrar', () => {
  it('credenciales inválidas, con o sin código', () => {
    expect(motivoFallaEntrada({ code: 'invalid_credentials', status: 400 })).toBe('credenciales');
    expect(motivoFallaEntrada({ status: 400, message: 'Invalid login credentials' })).toBe('credenciales');
  });

  it('correo sin confirmar es una cuenta que existe', () => {
    expect(motivoFallaEntrada({ code: 'email_not_confirmed', status: 400 })).toBe('sin-confirmar');
  });

  it('límites y fallas del servidor no dicen nada de la cuenta', () => {
    expect(motivoFallaEntrada({ code: 'over_request_rate_limit', status: 429 })).toBe('otro');
    expect(motivoFallaEntrada({ status: 500 })).toBe('otro');
    expect(motivoFallaEntrada(null)).toBe('otro');
  });
});

describe('datos del formulario', () => {
  it('el correo se compara en minúsculas y sin espacios', () => {
    expect(normalizarCorreo('  Ana.Perez@Correo.MX ')).toBe('ana.perez@correo.mx');
    expect(normalizarCorreo(null)).toBe('');
  });

  it('el nombre necesita al menos dos letras', () => {
    expect(nombreValido('Jo')).toBe(true);
    expect(nombreValido('Ñu')).toBe(true);
    expect(nombreValido('J')).toBe(false);
    expect(nombreValido('12')).toBe(false);
    expect(nombreValido('')).toBe(false);
  });

  it('el nombre se limpia de espacios de más y se recorta', () => {
    expect(limpiarNombre('  Juan   Carlos ')).toBe('Juan Carlos');
    expect(limpiarNombre('a'.repeat(120))).toHaveLength(80);
  });

  it('reconoce cuando el correo ya tenía cuenta al crearla', () => {
    expect(esCorreoRegistrado({ code: 'email_exists', status: 422 })).toBe(true);
    expect(esCorreoRegistrado({ message: 'A user with this email address has already been registered' })).toBe(true);
    expect(esCorreoRegistrado({ code: 'weak_password', message: 'Password is too weak' })).toBe(false);
  });
});
