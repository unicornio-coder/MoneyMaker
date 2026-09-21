// Lectura de PDF en memoria con pdf.js: valida, abre (con contraseña si hace falta) y reconstruye el texto por líneas.
// La contraseña solo vive en esta llamada. Nada de aquí se registra en logs.

import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { ErrorImportacion } from './tipos';

export const PDF_MAX_BYTES = 10 * 1024 * 1024;

export function esPdf(datos: Buffer): boolean {
  return datos.length > 5 && datos.subarray(0, 5).toString('latin1') === '%PDF-';
}

export type PdfLeido = { paginas: number; texto: string; cifrado: boolean };

type ItemTexto = { str: string; transform: number[]; width?: number };

function abrir(datos: Buffer, contraseña?: string | null) {
  const tarea = pdfjs.getDocument({
    data: new Uint8Array(datos),
    password: contraseña ?? undefined,
    useSystemFonts: false,
    disableFontFace: true,
    verbosity: 0,
  });
  return { tarea, promesa: tarea.promise };
}

function esExcepcion(e: unknown, nombre: string): e is { name: string; code?: number; message?: string } {
  return typeof e === 'object' && e !== null && (e as { name?: string }).name === nombre;
}

/** Une los fragmentos de una página en líneas (misma altura), ordenados de izquierda a derecha. */
function lineasDePagina(items: ItemTexto[]): string[] {
  const filas = new Map<number, { x: number; s: string; w: number }[]>();
  for (const it of items) {
    if (!it.str || !it.str.trim()) continue;
    const y = Math.round(it.transform[5] / 3) * 3;
    const fila = filas.get(y) ?? [];
    fila.push({ x: it.transform[4], s: it.str, w: it.width ?? 0 });
    filas.set(y, fila);
  }
  return [...filas.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([, fila]) => {
      fila.sort((a, b) => a.x - b.x);
      let linea = '';
      let finAnterior = -Infinity;
      for (const f of fila) {
        const hueco = f.x - finAnterior;
        linea += (linea ? (hueco > 12 ? '  ' : ' ') : '') + f.s.trim();
        finAnterior = f.x + f.w;
      }
      return linea;
    });
}

/** Abre el PDF y devuelve el texto por líneas. Lanza ErrorImportacion: corrupto, necesita_contraseña, contraseña_incorrecta. */
export async function leerPdf(datos: Buffer, contraseña?: string | null): Promise<PdfLeido> {
  if (!esPdf(datos)) throw new ErrorImportacion('no_pdf');
  if (datos.length > PDF_MAX_BYTES) throw new ErrorImportacion('muy_grande');

  let abierto: ReturnType<typeof abrir> = abrir(datos);
  let doc: Awaited<typeof abierto.promesa>;
  let cifrado = false;
  try {
    doc = await abierto.promesa;
  } catch (e) {
    await abierto.tarea.destroy().catch(() => undefined);
    if (esExcepcion(e, 'PasswordException')) {
      if (!contraseña) throw new ErrorImportacion('necesita_contraseña');
      cifrado = true;
      abierto = abrir(datos, contraseña);
      try {
        doc = await abierto.promesa;
      } catch (e2) {
        await abierto.tarea.destroy().catch(() => undefined);
        if (esExcepcion(e2, 'PasswordException')) throw new ErrorImportacion('contraseña_incorrecta');
        throw new ErrorImportacion('corrupto');
      }
    } else {
      throw new ErrorImportacion('corrupto');
    }
  }

  try {
    const lineas: string[] = [];
    let largo = 0;
    for (let i = 1; i <= doc.numPages; i++) {
      const pagina = await doc.getPage(i);
      const contenido = await pagina.getTextContent();
      const nuevas = lineasDePagina(contenido.items as ItemTexto[]);
      lineas.push(...nuevas, '');
      largo += nuevas.reduce((s, l) => s + l.length + 1, 0);
      if (largo > 400_000) break;
    }
    return { paginas: doc.numPages, texto: lineas.join('\n').trim(), cifrado };
  } finally {
    await abierto.tarea.destroy().catch(() => undefined);
  }
}
