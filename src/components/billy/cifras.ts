/** Montos en pesos tal como los escribe Billy ("$12,450", "-$980", "$1,250.50"). */
const CIFRA = /(-?\$\s?\d[\d,]*(?:\.\d+)?)/g;

export type Segmento = { texto: string; cifra: boolean };

/**
 * Parte una respuesta en texto y cifras para destacar los montos con la tipografía de cifras. Solo cambia cómo se ve:
 * no agrega, quita ni recalcula ninguna cantidad (las cifras ya pasaron por el filtro del servidor).
 */
export function partirCifras(texto: string): Segmento[] {
  const out: Segmento[] = [];
  let ultimo = 0;
  for (const m of texto.matchAll(CIFRA)) {
    const i = m.index ?? 0;
    if (i > ultimo) out.push({ texto: texto.slice(ultimo, i), cifra: false });
    out.push({ texto: m[0], cifra: true });
    ultimo = i + m[0].length;
  }
  if (ultimo < texto.length) out.push({ texto: texto.slice(ultimo), cifra: false });
  return out;
}
