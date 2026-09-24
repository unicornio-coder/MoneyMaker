// PDF de la carta de cancelación con pdf-lib (sin fuentes externas: Helvetica soporta acentos y ñ).

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { cartaCancelacion, type DatosCarta } from '@/lib/domain/carta';

const ANCHO = 595.28; // A4
const ALTO = 841.89;
const MARGEN = 64;
const TINTA = rgb(0.043, 0.122, 0.09); // #0B1F17
const GRIS = rgb(0.42, 0.46, 0.44);
const VERDE = rgb(0.086, 0.639, 0.29); // #16A34A

function envolver(texto: string, ancho: number, medir: (s: string) => number): string[] {
  const lineas: string[] = [];
  let actual = '';
  for (const palabra of texto.split(/\s+/)) {
    const prueba = actual ? `${actual} ${palabra}` : palabra;
    if (medir(prueba) <= ancho) actual = prueba;
    else {
      if (actual) lineas.push(actual);
      actual = palabra;
    }
  }
  if (actual) lineas.push(actual);
  return lineas;
}

export async function generarCartaPdf(d: DatosCarta): Promise<Uint8Array> {
  const carta = cartaCancelacion(d);
  const doc = await PDFDocument.create();
  doc.setTitle(carta.titulo);
  doc.setLanguage('es-MX');
  const cuerpo = await doc.embedFont(StandardFonts.Helvetica);
  const negrita = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([ANCHO, ALTO]);
  const anchoTexto = ANCHO - MARGEN * 2;
  let y = ALTO - MARGEN;

  const escribir = (texto: string, opciones: { font?: typeof cuerpo; size?: number; color?: typeof TINTA; espacio?: number } = {}) => {
    const font = opciones.font ?? cuerpo;
    const size = opciones.size ?? 11;
    const alto = size * 1.45;
    for (const linea of envolver(texto, anchoTexto, (s) => font.widthOfTextAtSize(s, size))) {
      page.drawText(linea, { x: MARGEN, y: y - size, size, font, color: opciones.color ?? TINTA });
      y -= alto;
    }
    y -= opciones.espacio ?? 0;
  };

  page.drawRectangle({ x: MARGEN, y: y - 3, width: 28, height: 3, color: VERDE });
  y -= 18;
  escribir(carta.titulo, { font: negrita, size: 18, espacio: 14 });
  for (const l of carta.encabezado) escribir(l, { espacio: 2 });
  y -= 12;
  for (const p of carta.parrafos) escribir(p, { espacio: 10 });
  y -= 10;
  escribir(carta.cierre[0], { espacio: 26 });
  escribir(carta.cierre[1], { font: negrita, espacio: 0 });
  page.drawText(carta.pie, { x: MARGEN, y: MARGEN - 20, size: 8.5, font: cuerpo, color: GRIS });
  return doc.save();
}
