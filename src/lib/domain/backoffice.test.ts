import { describe, expect, it } from 'vitest';
import { esAdmin, esCuentaDePrueba, etiquetaEvento, haceCuanto, resumenBackoffice, type ArchivoAdmin, type EventoAdmin, type PerfilAdmin } from './backoffice';

const AHORA = new Date('2026-11-19T18:00:00Z');
const hace = (dias: number, horas = 0) => new Date(AHORA.getTime() - dias * 86_400_000 - horas * 3_600_000).toISOString();

describe('back office: quién entra', () => {
  it('solo los correos de la lista, sin importar mayúsculas ni espacios', () => {
    expect(esAdmin('JC@MoneyMaker.mx', 'jc@moneymaker.mx, socio@moneymaker.mx')).toBe(true);
    expect(esAdmin('socio@moneymaker.mx', 'jc@moneymaker.mx  socio@moneymaker.mx')).toBe(true);
    expect(esAdmin('otro@correo.com', 'jc@moneymaker.mx')).toBe(false);
  });

  it('sin lista o sin correo no entra nadie', () => {
    expect(esAdmin('jc@moneymaker.mx', '')).toBe(false);
    expect(esAdmin('jc@moneymaker.mx', undefined)).toBe(false);
    expect(esAdmin('', 'jc@moneymaker.mx')).toBe(false);
    expect(esAdmin(null, ', ,')).toBe(false);
  });

  it('un correo que solo se parece no entra', () => {
    expect(esAdmin('jc@moneymaker.mx.evil.com', 'jc@moneymaker.mx')).toBe(false);
    expect(esAdmin('xjc@moneymaker.mx', 'jc@moneymaker.mx')).toBe(false);
  });
});

describe('back office: resumen de actividad', () => {
  const perfiles: PerfilAdmin[] = [
    { id: 'a', email: 'ana@correo.com', nombre: 'Ana', creado: hace(2), onboardingCompleto: true },
    { id: 'b', email: 'beto@correo.com', nombre: null, creado: hace(20), onboardingCompleto: false },
    { id: 'c', email: 'carla@correo.com', nombre: 'Carla', creado: hace(40), onboardingCompleto: true },
    { id: 'q', email: 'mariana.gutierrez@example.com', nombre: 'Mariana', creado: hace(1), onboardingCompleto: true },
  ];
  // Los eventos llegan del más reciente al más antiguo, como los entrega la consulta.
  const eventos: EventoAdmin[] = [
    { userId: 'q', nombre: 'billy_respuesta', cuando: hace(0, 1) },
    { userId: 'a', nombre: 'billy_respuesta', cuando: hace(0, 2), sospechosa: true },
    { userId: 'a', nombre: 'billy_respuesta', cuando: hace(0, 3) },
    { userId: 'a', nombre: 'importacion', cuando: hace(1) },
    { userId: 'c', nombre: 'presupuesto_editado', cuando: hace(12) },
    { userId: null, nombre: 'registro', cuando: hace(13) },
  ];
  const archivos: ArchivoAdmin[] = [
    { userId: 'a', estado: 'confirmado', cuando: hace(1) },
    { userId: 'b', estado: 'error', cuando: hace(3) },
    { userId: 'q', estado: 'error', cuando: hace(1) },
  ];
  const r = resumenBackoffice({ perfiles, eventos, archivos, ahora: AHORA });

  it('los totales no cuentan las cuentas de prueba', () => {
    expect(r.usuarios).toBe(3);
    expect(r.nuevos7d).toBe(1);
    expect(r.onboarding).toBe(2);
    expect(r.conArchivo).toBe(2);
    expect(r.archivosConError7d).toBe(1);
    expect(r.preguntasBilly7d).toBe(2);
    expect(r.preguntasSospechosas7d).toBe(1);
  });

  it('activos son quienes hicieron algo en los últimos 7 días', () => {
    expect(r.activos7d).toBe(2);
  });

  it('ordena por última actividad y dice qué fue lo último que hizo cada quien', () => {
    expect(r.filas.map((f) => f.id)).toEqual(['q', 'a', 'b', 'c']);
    const ana = r.filas.find((f) => f.id === 'a')!;
    expect(ana.ultimoEvento).toBe('Le preguntó a Billy');
    expect(ana.eventos).toBe(3);
    expect(ana.archivos).toBe(1);
    const beto = r.filas.find((f) => f.id === 'b')!;
    expect(beto.ultimoEvento).toBe('Falló la lectura de un archivo');
    expect(beto.archivosConError).toBe(1);
    expect(r.filas.find((f) => f.id === 'q')!.prueba).toBe(true);
  });

  it('la actividad reciente trae el correo cuando el evento tiene usuario', () => {
    expect(r.actividad[0]).toEqual({ cuando: hace(0, 1), nombre: 'Le preguntó a Billy', email: 'mariana.gutierrez@example.com', prueba: true });
    expect(r.actividad[r.actividad.length - 1].email).toBeNull();
  });

  it('sin datos devuelve ceros', () => {
    const v = resumenBackoffice({ perfiles: [], eventos: [], archivos: [], ahora: AHORA });
    expect(v.usuarios).toBe(0);
    expect(v.filas).toEqual([]);
    expect(v.actividad).toEqual([]);
  });
});

describe('back office: textos', () => {
  it('reconoce las cuentas de prueba de QA', () => {
    expect(esCuentaDePrueba('diego.ramirez@example.com')).toBe(true);
    expect(esCuentaDePrueba('diego@example.com.mx')).toBe(false);
  });

  it('traduce los eventos y no se rompe con uno desconocido', () => {
    expect(etiquetaEvento('import_error')).toBe('Falló la lectura de un archivo');
    expect(etiquetaEvento('algo_nuevo')).toBe('algo nuevo');
  });

  it('dice hace cuánto pasó algo', () => {
    expect(haceCuanto(null, AHORA)).toBe('Sin actividad');
    expect(haceCuanto(new Date(AHORA.getTime() - 20_000).toISOString(), AHORA)).toBe('hace un momento');
    expect(haceCuanto(new Date(AHORA.getTime() - 5 * 60_000).toISOString(), AHORA)).toBe('hace 5 min');
    expect(haceCuanto(hace(0, 3), AHORA)).toBe('hace 3 h');
    expect(haceCuanto(hace(1), AHORA)).toBe('hace 1 día');
    expect(haceCuanto(hace(12), AHORA)).toBe('hace 12 días');
    expect(haceCuanto(hace(90), AHORA)).toMatch(/2026/);
  });
});
