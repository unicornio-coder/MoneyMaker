import { beforeAll, describe, expect, it, vi } from 'vitest';
import { CASOS, crearPdfEstado } from '../../../../scripts/qa-pdfs.mjs';
import { ErrorImportacion } from './tipos';

// Con llave configurada: un PDF cuyas sumas cuadran con los totales del banco se lee con reglas y el modelo ni se
// llama. Si no se puede comprobar el cuadre, se llama al modelo; y si el servicio lo rechaza (401), se cae a reglas con aviso.
// Sin espías de vitest: el modelo simulado solo cuenta llamadas y lanza el error que le pongamos.
const llm = vi.hoisted(() => {
  const estado = { fallo: null as Error | null, llamadas: 0 };
  return { estado, hayLLM: () => true, extraerEstadoDeCuenta: async () => { estado.llamadas++; throw estado.fallo ?? new Error('sin respuesta simulada'); } };
});
vi.mock('../llm', () => ({ hayLLM: llm.hayLLM, extraerEstadoDeCuenta: llm.extraerEstadoDeCuenta }));

// Para simular un estado de cuenta que no imprime totales (no hay contra qué comprobar las reglas).
const cuadre = vi.hoisted(() => ({ forzar: null as 'ok' | 'sin_cuadre' | 'sin_resumen' | null }));
vi.mock('@/lib/domain/dedupe', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/domain/dedupe')>();
  return { ...real, evaluarCuadre: (...args: Parameters<typeof real.evaluarCuadre>) => { const r = real.evaluarCuadre(...args); return cuadre.forzar ? { ...r, cuadre: cuadre.forzar } : r; } };
});

import { fuentePdf } from './statement-pdf';

let pdf: Buffer;
beforeAll(async () => {
  pdf = await crearPdfEstado(CASOS[0]);
});

describe('PDF con llave configurada: el cuadre decide si se paga el modelo', () => {
  it('si las reglas cuadran con los totales del banco, el modelo no se llama y no hay aviso', async () => {
    cuadre.forzar = null;
    llm.estado.llamadas = 0;
    llm.estado.fallo = new ErrorImportacion('lectura_no_disponible', '401 AuthenticationError');
    const r = await fuentePdf.extraer({ nombre: 'bbva.pdf', datos: pdf });
    expect(r.metodo).toBe('reglas');
    expect(r.movimientos).toHaveLength(CASOS[0].movimientos.length);
    expect(r.tokens).toEqual({ entrada: 0, salida: 0 });
    expect(r.advertencias).toEqual([]);
    expect(llm.estado.llamadas).toBe(0);
  });
});

describe('PDF cuando el servicio de lectura falla', () => {
  beforeAll(() => {
    cuadre.forzar = 'sin_resumen';
  });

  it('llave rechazada: se lee con reglas, con todos los movimientos y un aviso', async () => {
    llm.estado.fallo = new ErrorImportacion('lectura_no_disponible', '401 AuthenticationError');
    const etapas: string[] = [];
    const r = await fuentePdf.extraer({ nombre: 'bbva.pdf', datos: pdf, onEtapa: (e) => etapas.push(e) });
    expect(r.metodo).toBe('reglas');
    expect(r.movimientos).toHaveLength(CASOS[0].movimientos.length);
    expect(r.resumen).toMatchObject({ institucion: 'BBVA', ultimos4: '0001', esEstadoDeCuenta: true });
    expect(r.advertencias.some((a) => a.includes('rechazó la llave'))).toBe(true);
    expect(etapas).toEqual(['leyendo', 'extrayendo', 'cuadrando']);
  });

  it('servicio caído: también se lee con reglas; un documento ilegible sigue siendo ilegible', async () => {
    llm.estado.fallo = new ErrorImportacion('servidor', 'Sin conexión con el servicio de lectura');
    const r = await fuentePdf.extraer({ nombre: 'bbva.pdf', datos: pdf });
    expect(r.metodo).toBe('reglas');
    expect(r.advertencias.some((a) => a.includes('no respondió'))).toBe(true);

    llm.estado.fallo = new ErrorImportacion('ilegible');
    await expect(fuentePdf.extraer({ nombre: 'bbva.pdf', datos: pdf })).rejects.toMatchObject({ codigo: 'ilegible' });
  });

  it('si las reglas no sacan ningún movimiento, se dice el motivo real (la llave), no "no es estado de cuenta"', async () => {
    llm.estado.fallo = new ErrorImportacion('lectura_no_disponible');
    const { PDFDocument, StandardFonts } = await import('pdf-lib');
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    doc.addPage([612, 792]).drawText('Carta de bienvenida. Gracias por abrir tu cuenta con nosotros el día de hoy, ' + 'bienvenido '.repeat(40), { x: 50, y: 700, size: 10, font, maxWidth: 500 });
    const carta = Buffer.from(await doc.save());
    await expect(fuentePdf.extraer({ nombre: 'carta.pdf', datos: carta })).rejects.toMatchObject({ codigo: 'lectura_no_disponible' });
  });
});
