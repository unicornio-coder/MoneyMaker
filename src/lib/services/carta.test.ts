import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { generarCartaPdf } from './carta';

describe('PDF de la carta', () => {
  it('genera un PDF de una página con título', async () => {
    const pdf = await generarCartaPdf({ servicio: 'Total Play', titular: 'Juan Carlos Ostos Naim', correo: 'jc@billup.mx', ultimos4: '0001', montoMensual: 899, fecha: '2026-09-24', notas: 'Contrato 123456. Ya intenté cancelar por teléfono dos veces y me dejaron esperando.' });
    expect(pdf.length).toBeGreaterThan(1500);
    expect(Buffer.from(pdf.slice(0, 5)).toString('latin1')).toBe('%PDF-');
    const doc = await PDFDocument.load(pdf);
    expect(doc.getPageCount()).toBe(1);
    expect(doc.getTitle()).toBe('Solicitud de cancelación de Total Play');
  });
});
