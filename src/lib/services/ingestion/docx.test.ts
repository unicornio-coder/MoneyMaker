import { deflateRawSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { esDocx, leerDocx, textoDeXmlWord } from './docx';

/** ZIP mínimo de una sola entrada, como lo arma Word (deflate) o sin comprimir. */
function zip(nombre: string, contenido: string, comprimir: boolean): Buffer {
  const crudo = Buffer.from(contenido, 'utf8');
  const cuerpo = comprimir ? deflateRawSync(crudo) : crudo;
  const n = Buffer.from(nombre, 'utf8');
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(comprimir ? 8 : 0, 8);
  local.writeUInt32LE(cuerpo.length, 18);
  local.writeUInt32LE(crudo.length, 22);
  local.writeUInt16LE(n.length, 26);
  const dir = Buffer.alloc(46);
  dir.writeUInt32LE(0x02014b50, 0);
  dir.writeUInt16LE(comprimir ? 8 : 0, 10);
  dir.writeUInt32LE(cuerpo.length, 20);
  dir.writeUInt32LE(crudo.length, 24);
  dir.writeUInt16LE(n.length, 28);
  dir.writeUInt32LE(0, 42);
  const inicioDir = 30 + n.length + cuerpo.length;
  const fin = Buffer.alloc(22);
  fin.writeUInt32LE(0x06054b50, 0);
  fin.writeUInt16LE(1, 8);
  fin.writeUInt16LE(1, 10);
  fin.writeUInt32LE(46 + n.length, 12);
  fin.writeUInt32LE(inicioDir, 16);
  return Buffer.concat([local, n, cuerpo, dir, n, fin]);
}

const XML = '<w:document><w:body><w:p><w:r><w:t>BBVA Estado de cuenta</w:t></w:r></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>02/08</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>NETFLIX &amp; CO</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>249.00</w:t></w:r></w:p></w:tc></w:tr></w:tbl></w:body></w:document>';

describe('lectura de Word (.docx)', () => {
  it('saca el texto de un .docx comprimido', () => {
    const archivo = zip('word/document.xml', XML, true);
    expect(esDocx(archivo)).toBe(true);
    const texto = leerDocx(archivo)!;
    expect(texto).toContain('BBVA Estado de cuenta');
    expect(texto).toContain('NETFLIX & CO');
    expect(texto).toContain('249.00');
  });

  it('también lee una entrada sin comprimir', () => {
    expect(leerDocx(zip('word/document.xml', XML, false))).toContain('02/08');
  });

  it('un ZIP que no es Word no pasa', () => {
    const otro = zip('xl/workbook.xml', '<x/>', true);
    expect(esDocx(otro)).toBe(false);
    expect(leerDocx(otro)).toBeNull();
    expect(esDocx(Buffer.from('%PDF-1.7 hola'))).toBe(false);
  });

  it('separa párrafos en renglones y celdas con tabulador', () => {
    expect(textoDeXmlWord('<w:p><w:r><w:t>a</w:t></w:r></w:p><w:p><w:r><w:t>b</w:t><w:tab/><w:t>c</w:t></w:r></w:p>')).toBe('a\nb\tc');
  });
});
