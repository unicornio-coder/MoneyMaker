import { describe, expect, it } from 'vitest';
import { armarDatosBot, cifrasEnTexto, cifrasInventadas, intencionDe, respuestaDeReglas } from './telegram';
import { quincenaDe } from './quincena';
import type { Recurrente } from './tipos';

const HOY = new Date(2026, 10, 11);
const mxn = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
const rec = (nombre: string, monto: number, extra: Partial<Recurrente> = {}): Recurrente => ({ id: nombre, nombre, tipo: 'suscripcion', monto, diaCobro: 13, frecuencia: 'mensual', veces: 4, activo: true, origen: 'detectado', ultimoCargo: '2026-10-13', ...extra });

describe('bot de Telegram: datos y respuestas', () => {
  const rango = quincenaDe(HOY, [15, 30]);
  const vs = { limiteTotal: 9000, gastado: 6150, libres: 2850, porDia: 712.5, diasRestantes: 4 };
  const d = armarDatosBot({ rango, vs, recurrentes: [rec('Netflix', 249), rec('Spotify', 129), rec('Gimnasio', 549, { canceladoAt: '2026-10-01' }), rec('Renta', 7800, { tipo: 'servicio' })], movimientos: 26, hoy: HOY, diasPago: [15, 30] });

  it('usa las mismas cifras que Presupuesto y solo suscripciones activas', () => {
    expect(d.teQueda).toBe(2850);
    expect(d.gastado).toBe(6150);
    expect(d.limite).toBe(9000);
    expect(d.diasRestantes).toBe(4);
    expect(d.suscripciones).toEqual([{ nombre: 'Netflix', mensual: 249 }, { nombre: 'Spotify', mensual: 129 }]);
    expect(d.totalSuscripciones).toBe(378);
    expect(d.totalSuscripcionesAnual).toBe(4536);
  });

  it('reconoce las tres preguntas', () => {
    expect(intencionDe('¿Cuánto me queda hasta mi quincena?')).toBe('queda');
    expect(intencionDe('cuanto pago de suscripciones')).toBe('suscripciones');
    expect(intencionDe('Qué me van a cobrar esta semana')).toBe('cobros');
    expect(intencionDe('hola')).toBe('ayuda');
  });

  it('responde con reglas cuando no hay modelo', () => {
    expect(respuestaDeReglas('queda', d, mxn)).toBe('Te quedan $2,850 para 4 días: llevas $6,150 de $9,000. Son $713 por día.');
    expect(respuestaDeReglas('suscripciones', d, mxn)).toBe('Pagas $378 al mes en 2 suscripciones. Las más caras: Netflix $249, Spotify $129.');
  });

  it('avisa cuando el usuario ya se pasó del límite', () => {
    const pasado = armarDatosBot({ rango, vs: { limiteTotal: 9000, gastado: 9400, libres: -400, porDia: 0, diasRestantes: 4 }, recurrentes: [], movimientos: 30, hoy: HOY });
    expect(respuestaDeReglas('queda', pasado, mxn)).toContain('Ya te pasaste por $400');
  });

  it('si la quincena actual no tiene movimientos, habla del último periodo con datos y no de hoy', () => {
    const agosto = quincenaDe(new Date(2026, 7, 20), [15, 30]);
    const viejo = armarDatosBot({ rango: agosto, periodoActual: false, vs: { limiteTotal: 9000, gastado: 6150, libres: 2850, porDia: 0, diasRestantes: 0 }, recurrentes: [], movimientos: 26, hoy: HOY });
    const texto = respuestaDeReglas('queda', viejo, mxn);
    expect(texto).toContain('No tengo movimientos de tu quincena actual');
    expect(texto).toContain(agosto.etiqueta);
    expect(texto).toContain('te quedaron $2,850: gastaste $6,150 de $9,000');
    expect(cifrasInventadas(texto, viejo)).toEqual([]);
  });

  it('sin movimientos no dice ninguna cifra', () => {
    const vacio = armarDatosBot({ rango, vs: { limiteTotal: 0, gastado: 0, libres: 0, porDia: 0, diasRestantes: 4 }, recurrentes: [], movimientos: 0, hoy: HOY });
    expect(cifrasEnTexto(respuestaDeReglas('queda', vacio, mxn))).toEqual([]);
  });

  it('detecta una cifra que no está en los datos', () => {
    expect(cifrasEnTexto('Te quedan $2,850 y pagas 378 pesos')).toEqual([2850, 378]);
    expect(cifrasInventadas('Te quedan $2,850 para 4 días, unos $713 diarios.', d)).toEqual([]);
    expect(cifrasInventadas('Te quedan $3,000 para 4 días.', d)).toEqual([3000]);
    expect(cifrasInventadas('Si cancelas Netflix ahorras $2,988 al año.', d)).toEqual([2988]);
  });
});
