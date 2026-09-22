// Logos de bancos y comercios: se intentan varias fuentes públicas por dominio y, si ninguna carga,
// un monograma en el color de la marca (nunca gris anónimo).

import { infoBanco } from '@/lib/domain/comercios';

/** Fuentes en orden de preferencia. El navegador salta a la siguiente cuando una falla. */
export function fuentesLogo(domain: string | null | undefined): string[] {
  const d = (domain ?? '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  if (!d) return [];
  return [`https://www.google.com/s2/favicons?domain=${encodeURIComponent(d)}&sz=128`, `https://icons.duckduckgo.com/ip3/${encodeURIComponent(d)}.ico`];
}

// Solo colores de la paleta: tinta, verde, azul (gasto), índigo (inversión).
const PALETA = ['#0B1F17', '#16A34A', '#2563EB', '#6366F1'];

/** Color de fondo del monograma: el del banco si lo conocemos; si no, uno estable de la paleta según el nombre. */
export function colorDeMarca(nombre: string, domain?: string | null): string {
  const banco = infoBanco(nombre);
  if (banco.dominio && (!domain || banco.dominio === domain)) return banco.color;
  let h = 0;
  for (const ch of (domain || nombre).toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETA[h % PALETA.length];
}
