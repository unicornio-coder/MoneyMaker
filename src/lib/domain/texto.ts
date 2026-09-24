// Helpers de texto sin dependencias (ni catálogos): los usan componentes de cliente y el categorizador.

/** Mayúsculas, sin acentos, sin caracteres raros, espacios colapsados. Conserva '*' y '/' que usan Apple/Google/Uber. */
export function normalizar(descripcion: string): string {
  return descripcion
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9 *&/.\-+]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}


/**
 * Detalle corto cuando no hay recibo: lo que el descriptor sí dice y el nombre limpio pierde.
 * "UBER *TRIP" → "Viaje", "OXXO SUC 4521" → "Sucursal 4521", "AMZN MKTP MX" → "Compra en línea",
 * "MERCADOPAGO*FARMACIA" → "Pago a Farmacia", "PAYPAL *SPOTIFY" → "Pago a Spotify". null si no aporta nada.
 */
export function detalleBasico(descripcion: string): string | null {
  const n = normalizar(descripcion);
  if (/\bUBER\b.*\b(EATS)\b|\bUBER\s*EATS\b/.test(n)) return 'Pedido de comida';
  if (/\bUBER\b/.test(n) && /\b(TRIP|BV|VIAJE|RIDE)\b|UBER\s*\*|\bUBER\s*$/.test(n)) return 'Viaje';
  if (/\bDIDI\b/.test(n)) return /\bFOOD\b/.test(n) ? 'Pedido de comida' : 'Viaje';
  if (/\bRAPPI\b/.test(n)) return /\b(PRO|PRIME)\b/.test(n) ? 'Membresía' : 'Pedido';
  if (/\b(AMZN|AMAZON)\b/.test(n)) return /\bPRIME\b/.test(n) ? 'Membresía Prime' : /\bMKTP\b|MARKETPLACE/.test(n) ? 'Compra en línea' : null;
  const pago = /\b(MERCADOPAGO|MERCADO PAGO|PAYPAL|CLIP|STRIPE|OPENPAY|CONEKTA)\b\s*\*?\s*([A-Z][A-Z0-9 ]{2,30})/.exec(n);
  if (pago) {
    const a = pago[2].replace(/\b(MX|MEXICO|SA DE CV|SAPI)\b/g, ' ').replace(/\b\d{3,}\b/g, ' ').replace(/\s+/g, ' ').trim();
    if (a) return `Pago a ${a.split(' ').slice(0, 3).map((w) => w[0] + w.slice(1).toLowerCase()).join(' ')}`;
  }
  const suc = /\b(?:SUC|SUCURSAL|TIENDA|EST|ESTACION)\.?\s*#?\s*(\d{2,6})\b/.exec(n) ?? /\b(?:OXXO|7 ?ELEVEN|WALMART|SORIANA|CHEDRAUI|HEB|COSTCO|SAMS|FARMACIA[S]? (?:GUADALAJARA|DEL AHORRO|SAN PABLO|BENAVIDES)|PEMEX|G500|OXXO GAS)\b[^\d]{0,20}(\d{3,6})\b/.exec(n);
  if (suc) return `Sucursal ${suc[1]}`;
  if (/\b(PEMEX|GASOLINERA|G500|OXXO GAS|BP|SHELL|MOBIL)\b/.test(n)) return 'Gasolina';
  if (/\b(CAJERO|ATM|RETIRO|DISPOSICION)\b/.test(n)) return 'Retiro en cajero';
  if (/\b(ANUALIDAD)\b/.test(n)) return 'Anualidad';
  if (/\b(INTERES|INTERESES)\b/.test(n)) return 'Intereses';
  return null;
}
