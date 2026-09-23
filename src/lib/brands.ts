// Marcas (bancos y comercios): de dónde sale cada logo y de qué color es el monograma de respaldo.
// Cadena de fuentes: archivo local en /public/logos (bajado por scripts/fetch-logos.mjs) → Brandfetch → Clearbit →
// favicon de Google → DuckDuckGo → iniciales en el color de la marca. El navegador salta a la siguiente cuando una falla.

import { infoBanco } from '@/lib/domain/comercios';
import locales from './brands.locales.json';

/** Dominios con logo local (`public/logos/<dominio>.png|svg`), generado por `npm run logos`. */
const LOCALES = new Map<string, string>(Object.entries(locales as Record<string, string>));

// Solo colores de la paleta: tinta, verde, azul (gasto), índigo (inversión).
const PALETA = ['#0B1F17', '#16A34A', '#2563EB', '#6366F1'];

export function normalizarDominio(domain: string | null | undefined): string {
  return (domain ?? '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '');
}

/** Ruta local del logo si lo tenemos bajado; null si no. */
export function logoLocal(domain: string | null | undefined): string | null {
  const d = normalizarDominio(domain);
  const archivo = d && LOCALES.get(d);
  return archivo ? `/logos/${archivo}` : null;
}

/** Fuentes en orden de preferencia. */
export function fuentesLogo(domain: string | null | undefined, size = 128): string[] {
  const d = normalizarDominio(domain);
  if (!d) return [];
  const out: string[] = [];
  const local = logoLocal(d);
  if (local) out.push(local);
  const brandfetch = process.env.NEXT_PUBLIC_BRANDFETCH_CLIENT_ID;
  if (brandfetch) out.push(`https://cdn.brandfetch.io/${encodeURIComponent(d)}/w/${size}/h/${size}?c=${encodeURIComponent(brandfetch)}`);
  out.push(`https://logo.clearbit.com/${encodeURIComponent(d)}?size=${size}`);
  out.push(`https://www.google.com/s2/favicons?domain=${encodeURIComponent(d)}&sz=${size}`);
  out.push(`https://icons.duckduckgo.com/ip3/${encodeURIComponent(d)}.ico`);
  return out;
}

/** Color de fondo del monograma: el del banco si lo conocemos; si no, uno estable de la paleta según el nombre. */
export function colorDeMarca(nombre: string, domain?: string | null): string {
  const banco = infoBanco(nombre);
  if (banco.dominio && (!domain || banco.dominio === normalizarDominio(domain))) return banco.color;
  let h = 0;
  for (const ch of (normalizarDominio(domain) || nombre).toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETA[h % PALETA.length];
}

/** Iniciales para el monograma: hasta dos letras. */
export function inicialesDeMarca(nombre: string): string {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}
