import { describe, expect, it } from 'vitest';
import { partirCifras } from './cifras';
import { desenlaceDe, EXT_OK, MAX_BYTES } from './subirEstado';
import type { Importacion } from '@/lib/domain/tipos';

describe('partirCifras', () => {
  it('separa los montos sin cambiar el texto', () => {
    const texto = 'Te quedan $4,250 para 6 días: llevas $8,750 de $13,000. Son $708 por día.';
    const partes = partirCifras(texto);
    expect(partes.map((p) => p.texto).join('')).toBe(texto);
    expect(partes.filter((p) => p.cifra).map((p) => p.texto)).toEqual(['$4,250', '$8,750', '$13,000', '$708']);
  });

  it('reconoce negativos y centavos, y deja intacto un texto sin cifras', () => {
    expect(partirCifras('Saldo -$1,250.50 hoy').filter((p) => p.cifra).map((p) => p.texto)).toEqual(['-$1,250.50']);
    expect(partirCifras('No encontré suscripciones activas.')).toEqual([{ texto: 'No encontré suscripciones activas.', cifra: false }]);
  });
});

const imp = (cambios: Partial<Importacion>): Importacion => ({ id: 'i1', archivo: 'a.pdf', archivoHash: 'h', tamanoBytes: 1, estado: 'revisar', metodo: 'reglas', resumen: {} as Importacion['resumen'], movimientos: [], advertencias: [], cuadre: null, insertados: 0, duplicados: 0, tokensEntrada: 0, tokensSalida: 0, createdAt: '', updatedAt: '', ...cambios });

describe('desenlaceDe (mismo criterio que Importar)', () => {
  it('lista para revisar', () => {
    expect(desenlaceDe({ status: 200, json: { importacion: imp({}) } }).tipo).toBe('revisar');
  });
  it('ya subido por estado 409 o por código', () => {
    expect(desenlaceDe({ status: 409, json: { importacion: imp({ estado: 'error', error: 'ya_subido' }) } }).tipo).toBe('ya_subido');
    expect(desenlaceDe({ status: 200, json: { codigo: 'ya_subido' } }).tipo).toBe('ya_subido');
  });
  it('contraseña del PDF', () => {
    expect(desenlaceDe({ status: 200, json: { importacion: imp({ estado: 'necesita_contraseña' }) } }).tipo).toBe('contraseña');
    expect(desenlaceDe({ status: 422, json: { codigo: 'contraseña_incorrecta' } }).tipo).toBe('contraseña');
  });
  it('errores con su código; sin cuerpo según el estado HTTP', () => {
    expect(desenlaceDe({ status: 400, json: { codigo: 'no_pdf' } })).toEqual({ tipo: 'error', codigo: 'no_pdf' });
    expect(desenlaceDe({ status: 413, json: null })).toEqual({ tipo: 'error', codigo: 'muy_grande' });
    expect(desenlaceDe({ status: 401, json: null })).toEqual({ tipo: 'error', codigo: 'sesion_expirada' });
    expect(desenlaceDe({ status: 500, json: null })).toEqual({ tipo: 'error', codigo: 'servidor' });
  });
});

describe('archivos aceptados', () => {
  it('mismas extensiones y tope que Importar', () => {
    for (const n of ['estado.pdf', 'MOVS.CSV', 'a.txt', 'b.xlsx', 'c.xls', 'd.docx']) expect(EXT_OK.test(n)).toBe(true);
    for (const n of ['foto.jpg', 'estado.pdf.zip', 'doc.doc']) expect(EXT_OK.test(n)).toBe(false);
    expect(MAX_BYTES).toBe(10 * 1024 * 1024);
  });
});
