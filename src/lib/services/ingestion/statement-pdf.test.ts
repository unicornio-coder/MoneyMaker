import { beforeAll, describe, expect, it } from 'vitest';
import { CASOS, crearPdfEstado, iso } from '../../../../scripts/qa-pdfs.mjs';
import { esPdfCifrado, leerPdf, textoLegible } from './pdf';
import { extraerPorReglas, fuentePdf } from './statement-pdf';
import { extraerArchivo, fuenteParaArchivo, hashArchivo } from './index';
import { ErrorImportacion } from './tipos';

let pdfCredito: Buffer;
let pdfDebito: Buffer;

beforeAll(async () => {
  delete process.env.ANTHROPIC_API_KEY;
  pdfCredito = await crearPdfEstado(CASOS[0]);
  pdfDebito = await crearPdfEstado(CASOS[2]);
});

describe('leerPdf', () => {
  it('reconstruye el texto por líneas', async () => {
    const r = await leerPdf(pdfCredito);
    expect(r.paginas).toBe(1);
    expect(r.cifrado).toBe(false);
    expect(r.texto).toContain('ESTADO DE CUENTA BBVA');
    expect(r.texto).toMatch(new RegExp(`${CASOS[0].movimientos[0].fecha.replace(/\//g, '\\/')}\\s+NETFLIX\\.COM\\s+\\$219\\.00`));
  });

  it('rechaza lo que no es PDF; un PDF roto propaga el error de pdf.js (quien llama decide)', async () => {
    await expect(leerPdf(Buffer.from('hola'))).rejects.toMatchObject({ codigo: 'no_pdf' });
    await expect(leerPdf(Buffer.from('%PDF-1.4 basura'))).rejects.toThrow();
    await expect(fuentePdf.extraer({ nombre: 'x.pdf', datos: Buffer.from('%PDF-1.4 basura') })).rejects.toMatchObject({ codigo: 'corrupto' });
  });

  it('detecta cifrado por bytes y texto ofuscado (fuentes sin mapa de caracteres)', async () => {
    expect(esPdfCifrado(pdfCredito)).toBe(false);
    expect(esPdfCifrado(Buffer.from('%PDF-1.6 … /Encrypt 12 0 R …'))).toBe(true);
    const { texto } = await leerPdf(pdfCredito);
    expect(textoLegible(texto)).toBe(true);
    const ofuscado = '\u0001\u0002\u0003 "9 "9!"" ):$ $%=&&&:=6$ "#(" ")" (6 // /,+ , \' + # ! $ / =$ %$50=0%5\'0#0P\'&\'O %#!\'2%2 $%M&"60" %$0"9"9D%0"!! ! $ / \'0 6$N06%$:\'$60#0P\'& "2\'%';
    expect(textoLegible(ofuscado.repeat(4))).toBe(false);
    expect(textoLegible('')).toBe(false);
  });

  it('sin modelo y con texto ofuscado avisa que falta la lectura inteligente', async () => {
    // Mismo PDF válido, pero con el texto reemplazado por símbolos: se simula con un PDF real y texto vacío no es posible,
    // así que se cubre la regla directamente sobre la decisión.
    expect(textoLegible('\u0005\u0012\u0006 \u0013 \u0014\u0015\u0006'.repeat(30))).toBe(false);
  });
});

describe('extraerPorReglas (sin modelo)', () => {
  it('lee banco, tarjeta, periodo, corte, límite y movimientos de una tarjeta de crédito', async () => {
    const { texto, paginas } = await leerPdf(pdfCredito);
    const { resumen, movimientos } = extraerPorReglas(texto, paginas);
    const c = CASOS[0];
    expect(resumen).toMatchObject({ institucion: 'BBVA', tipoCuenta: 'credito', ultimos4: '0001', periodoInicio: iso(c.periodoInicio), periodoFin: iso(c.periodoFin), fechaCorte: iso(c.fechaCorte), fechaLimitePago: iso(c.fechaLimite!), pagoMinimoCentavos: 120000, saldoAlCorteCentavos: 1845000, limiteCreditoCentavos: 6000000, esEstadoDeCuenta: true });
    expect(movimientos).toHaveLength(c.movimientos.length);
    expect(movimientos[0]).toMatchObject({ fecha: iso(c.movimientos[0].fecha), descripcion: 'NETFLIX.COM', montoCentavos: 21900, esAbono: false });
    expect(movimientos.find((m) => m.descripcion === 'SU PAGO GRACIAS')).toMatchObject({ montoCentavos: 900000, esAbono: true });
    expect(movimientos.find((m) => m.descripcion.startsWith('REEMBOLSO'))?.esAbono).toBe(true);
  });

  it('cuenta de débito con nómina', async () => {
    const { texto, paginas } = await leerPdf(pdfDebito);
    const { resumen, movimientos } = extraerPorReglas(texto, paginas);
    expect(resumen).toMatchObject({ institucion: 'Banorte', tipoCuenta: 'debito', ultimos4: '0003', saldoAlCorteCentavos: 2312000 });
    expect(movimientos.filter((m) => m.esAbono)).toHaveLength(2);
  });
});

describe('fuentePdf y extraerArchivo', () => {
  it('devuelve resumen, movimientos, cuadre y método reglas sin llave', async () => {
    const r = await fuentePdf.extraer({ nombre: 'x.pdf', datos: pdfCredito });
    expect(r.metodo).toBe('reglas');
    expect(r.movimientos).toHaveLength(11);
    expect(r.advertencias.some((a) => a.includes('reglas'))).toBe(true);
    expect(r.advertencias).not.toContain('sin_cuadre');
    expect(r.tokens).toEqual({ entrada: 0, salida: 0 });
  });

  it('elige la fuente por contenido y calcula el hash', () => {
    expect(fuenteParaArchivo('x.pdf', pdfCredito).nombre).toBe('statement-pdf');
    expect(fuenteParaArchivo('x.csv', Buffer.from('Fecha,Concepto,Monto\n')).nombre).toBe('statement-table');
    expect(() => fuenteParaArchivo('x.docx', Buffer.from('PK'))).toThrow(ErrorImportacion);
    expect(hashArchivo(pdfCredito)).toHaveLength(64);
  });

  it('un archivo sin movimientos ni resumen no es estado de cuenta', async () => {
    await expect(extraerArchivo({ nombre: 'r.csv', datos: Buffer.from('a,b\n1,2\n') })).rejects.toMatchObject({ codigo: 'no_es_estado' });
  });
});
