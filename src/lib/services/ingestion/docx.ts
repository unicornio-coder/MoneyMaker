// Word (.docx): un .docx es un ZIP con el texto en word/document.xml. Se lee sin librerías (zlib de Node) y se
// entrega como texto plano al mismo lector que usa el PDF. El .doc antiguo (binario) no se puede leer así.

import { inflateRawSync } from 'node:zlib';

const FIRMA_ZIP = 0x04034b50;
const FIRMA_DIRECTORIO = 0x02014b50;
const FIRMA_FIN = 0x06054b50;

/** ¿Es un .docx? Empieza como ZIP y trae word/document.xml. */
export function esDocx(datos: Buffer): boolean {
  return datos.length > 30 && datos.readUInt32LE(0) === FIRMA_ZIP && datos.includes('word/document.xml');
}

function entradaZip(datos: Buffer, nombre: string): Buffer | null {
  // El fin del directorio central está en los últimos ~64 KB.
  let fin = -1;
  for (let i = datos.length - 22; i >= Math.max(0, datos.length - 66_000); i--) {
    if (datos.readUInt32LE(i) === FIRMA_FIN) {
      fin = i;
      break;
    }
  }
  if (fin < 0) return null;
  const total = datos.readUInt16LE(fin + 10);
  let p = datos.readUInt32LE(fin + 16);
  for (let n = 0; n < total && p + 46 <= datos.length; n++) {
    if (datos.readUInt32LE(p) !== FIRMA_DIRECTORIO) return null;
    const metodo = datos.readUInt16LE(p + 10);
    const comprimido = datos.readUInt32LE(p + 20);
    const largoNombre = datos.readUInt16LE(p + 28);
    const largoExtra = datos.readUInt16LE(p + 30);
    const largoComentario = datos.readUInt16LE(p + 32);
    const local = datos.readUInt32LE(p + 42);
    const nombreEntrada = datos.toString('utf8', p + 46, p + 46 + largoNombre);
    if (nombreEntrada === nombre) {
      if (local + 30 > datos.length || datos.readUInt32LE(local) !== FIRMA_ZIP) return null;
      const inicio = local + 30 + datos.readUInt16LE(local + 26) + datos.readUInt16LE(local + 28);
      const cuerpo = datos.subarray(inicio, inicio + comprimido);
      if (metodo === 0) return cuerpo;
      if (metodo === 8) return inflateRawSync(cuerpo, { maxOutputLength: 40 * 1024 * 1024 });
      return null;
    }
    p += 46 + largoNombre + largoExtra + largoComentario;
  }
  return null;
}

const ENTIDADES: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'" };

/** Texto plano de un XML de Word: un renglón por párrafo, tabulador entre celdas. */
export function textoDeXmlWord(xml: string): string {
  return xml
    .replace(/<w:tab\b[^>]*\/>/g, '\t')
    .replace(/<w:br\b[^>]*\/>/g, '\n')
    .replace(/<\/w:tc>/g, '\t')
    .replace(/<\/w:p>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&(amp|lt|gt|quot|apos);/g, (m) => ENTIDADES[m] ?? m)
    .replace(/\t+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Texto de un .docx, o null si el archivo no se pudo abrir. */
export function leerDocx(datos: Buffer): string | null {
  try {
    const xml = entradaZip(datos, 'word/document.xml');
    return xml ? textoDeXmlWord(xml.toString('utf8')) : null;
  } catch {
    return null;
  }
}
