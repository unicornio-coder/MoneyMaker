// Lectura de PDF en memoria con pdf.js: valida, abre (con contraseña si hace falta) y reconstruye el texto por líneas.
// La contraseña solo vive en esta llamada. Nada de aquí se registra en logs.
// En Vercel el worker de pdf.js se resuelve por ruta absoluta (el import dinámico relativo no sobrevive al empaquetado).

import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { ErrorImportacion } from './tipos';

// pdf.js 6 usa Promise.withResolvers (Node 22). Si el runtime es más viejo (Node 20), se rellena para no caer con
// "Promise.withResolvers is not a function". package.json fija engines.node = 22.x; esto es la red de seguridad.
type ConResolvers = PromiseConstructor & { withResolvers?: <T>() => { promise: Promise<T>; resolve: (v: T | PromiseLike<T>) => void; reject: (e?: unknown) => void } };
if (typeof (Promise as ConResolvers).withResolvers !== 'function') {
  (Promise as ConResolvers).withResolvers = function withResolvers<T>() {
    let resolve!: (v: T | PromiseLike<T>) => void;
    let reject!: (e?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

export const PDF_MAX_BYTES = 10 * 1024 * 1024;

// Rutas por directorio de trabajo (sin require.resolve/createRequire: webpack los convertiría en un contexto sobre todo el paquete).
// En desarrollo es la raíz del proyecto; en Vercel, /var/task, donde outputFileTracingIncludes deja node_modules/pdfjs-dist.
function rutaPaquete(relativa: string): string | null {
  for (const base of [process.cwd(), path.join(process.cwd(), '..'), '/var/task']) {
    const ruta = path.join(base, 'node_modules', 'pdfjs-dist', relativa);
    if (existsSync(ruta)) return ruta;
  }
  return null;
}

const RUTA_WORKER = rutaPaquete('legacy/build/pdf.worker.mjs');
const RUTA_CMAPS = rutaPaquete('cmaps');
const RUTA_FUENTES = rutaPaquete('standard_fonts');

if (RUTA_WORKER && !pdfjs.GlobalWorkerOptions.workerSrc) pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(RUTA_WORKER).href;

export function esPdf(datos: Buffer): boolean {
  return datos.length > 5 && datos.subarray(0, 5).toString('latin1') === '%PDF-';
}

/** Cifrado por bytes (sin abrirlo): los PDF protegidos llevan /Encrypt en el trailer. */
export function esPdfCifrado(datos: Buffer): boolean {
  return datos.includes('/Encrypt');
}

/**
 * true si el texto extraído parece texto real (fechas, palabras) y no símbolos de una fuente sin mapa de caracteres.
 * Muchos bancos ofuscan las fuentes: entonces solo el modelo puede leer el documento (como imagen).
 */
export function textoLegible(texto: string): boolean {
  const t = texto.trim();
  if (t.length < 40) return false;
  const normales = (t.match(/[A-Za-zÁÉÍÓÚÑáéíóúñÜü0-9 .,:/$%\-\n]/g) ?? []).length;
  if (normales / t.length < 0.85) return false;
  const fechas = (t.match(/\b\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?\b|\b\d{1,2}\s+(?:de\s+)?(?:ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)[a-z]*\b/gi) ?? []).length;
  const palabras = (t.match(/\b[A-Za-zÁÉÍÓÚÑáéíóúñ]{4,}\b/g) ?? []).length;
  return fechas >= 2 && palabras >= 15;
}

export type PdfLeido = { paginas: number; texto: string; cifrado: boolean };

type ItemTexto = { str: string; transform: number[]; width?: number };

function abrir(datos: Buffer, contraseña?: string | null) {
  const tarea = pdfjs.getDocument({
    data: new Uint8Array(datos),
    password: contraseña ?? undefined,
    useSystemFonts: false,
    disableFontFace: true,
    cMapUrl: RUTA_CMAPS ? RUTA_CMAPS + '/' : undefined,
    cMapPacked: true,
    standardFontDataUrl: RUTA_FUENTES ? RUTA_FUENTES + '/' : undefined,
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

/**
 * Abre el PDF y devuelve el texto por líneas.
 * Lanza ErrorImportacion: no_pdf, muy_grande, necesita_contraseña, contraseña_incorrecta; o el error original de pdf.js
 * (para que quien llama decida si sigue sin texto, p. ej. mandando el PDF al modelo).
 */
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
        throw e2;
      }
    } else {
      throw e;
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
