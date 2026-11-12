import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { CASOS, crearPdfEstado } from '../../../../scripts/qa-pdfs.mjs';
import { ErrorImportacion } from './tipos';

// Con llave configurada pero rechazada por el servicio (401), el PDF con texto legible se lee con reglas y se avisa.
const llm = vi.hoisted(() => ({ hayLLM: vi.fn((): boolean => true), extraerEstadoDeCuenta: vi.fn() }));
vi.mock('../llm', () => llm);

import { fuentePdf } from './statement-pdf';

let pdf: Buffer;
beforeAll(async () => {
  pdf = await crearPdfEstado(CASOS[0]);
});

describe('PDF cuando el servicio de lectura falla', () => {
  beforeEach(() => llm.extraerEstadoDeCuenta.mockReset());

  it('llave rechazada: se lee con reglas, con todos los movimientos y un aviso', async () => {
    llm.extraerEstadoDeCuenta.mockImplementation(async () => { throw new ErrorImportacion('lectura_no_disponible', '401 AuthenticationError'); });
    const etapas: string[] = [];
    const r = await fuentePdf.extraer({ nombre: 'bbva.pdf', datos: pdf, onEtapa: (e) => etapas.push(e) });
    expect(r.metodo).toBe('reglas');
    expect(r.movimientos).toHaveLength(CASOS[0].movimientos.length);
    expect(r.resumen).toMatchObject({ institucion: 'BBVA', ultimos4: '0001', esEstadoDeCuenta: true });
    expect(r.advertencias.some((a) => a.includes('rechazó la llave'))).toBe(true);
    expect(etapas).toEqual(['leyendo', 'extrayendo', 'cuadrando']);
  });

  it('servicio caído: también se lee con reglas; un documento ilegible sigue siendo ilegible', async () => {
    llm.extraerEstadoDeCuenta.mockImplementation(async () => { throw new ErrorImportacion('servidor', 'Sin conexión con el servicio de lectura'); });
    const r = await fuentePdf.extraer({ nombre: 'bbva.pdf', datos: pdf });
    expect(r.metodo).toBe('reglas');
    expect(r.advertencias.some((a) => a.includes('no respondió'))).toBe(true);

    llm.extraerEstadoDeCuenta.mockImplementation(async () => { throw new ErrorImportacion('ilegible'); });
    await expect(fuentePdf.extraer({ nombre: 'bbva.pdf', datos: pdf })).rejects.toMatchObject({ codigo: 'ilegible' });
  });

  it('si las reglas no sacan ningún movimiento, se dice el motivo real (la llave), no "no es estado de cuenta"', async () => {
    llm.extraerEstadoDeCuenta.mockImplementation(async () => { throw new ErrorImportacion('lectura_no_disponible'); });
    const { PDFDocument, StandardFonts } = await import('pdf-lib');
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    doc.addPage([612, 792]).drawText('Carta de bienvenida. Gracias por abrir tu cuenta con nosotros el día de hoy, ' + 'bienvenido '.repeat(40), { x: 50, y: 700, size: 10, font, maxWidth: 500 });
    const carta = Buffer.from(await doc.save());
    await expect(fuentePdf.extraer({ nombre: 'carta.pdf', datos: carta })).rejects.toMatchObject({ codigo: 'lectura_no_disponible' });
  });
});
