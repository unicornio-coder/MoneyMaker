// Límite de peticiones por llave (usuario, correo, IP) con ventana fija en memoria. En Vercel cada instancia lleva su
// propio contador, así que el límite es "por instancia": suficiente para frenar bucles, bots simples y abuso accidental.
// Para un límite exacto entre instancias se cambia esta función por Upstash sin tocar a quien la llama.

import { MODO_MOCK } from '@/lib/supabase/env';

type Cubeta = { cuenta: number; inicio: number };

const cubetas = new Map<string, Cubeta>();
const MAX_LLAVES = 10_000;

export type Limite = { max: number; ventanaMs: number };
export type ResultadoLimite = { ok: true; restantes: number } | { ok: false; reintentarEnS: number };

export function limitar(clave: string, { max, ventanaMs }: Limite, ahora = Date.now()): ResultadoLimite {
  if (cubetas.size > MAX_LLAVES) {
    for (const [k, c] of cubetas) if (ahora - c.inicio > ventanaMs) cubetas.delete(k);
    if (cubetas.size > MAX_LLAVES) cubetas.clear();
  }
  const c = cubetas.get(clave);
  if (!c || ahora - c.inicio >= ventanaMs) {
    cubetas.set(clave, { cuenta: 1, inicio: ahora });
    return { ok: true, restantes: max - 1 };
  }
  if (c.cuenta >= max) return { ok: false, reintentarEnS: Math.max(1, Math.ceil((c.inicio + ventanaMs - ahora) / 1000)) };
  c.cuenta++;
  return { ok: true, restantes: max - c.cuenta };
}

/** Para rutas y acciones: en modo demo (un solo usuario compartido, pruebas E2E) no limita. */
export function limitarPeticion(clave: string, limite: Limite): ResultadoLimite {
  if (MODO_MOCK) return { ok: true, restantes: limite.max };
  return limitar(clave, limite);
}

/** Solo para pruebas. */
export function reiniciarLimites() {
  cubetas.clear();
}

/** IP del cliente detrás de Vercel; "desconocida" si no viene. */
export function ipDe(req: Request): string {
  const xf = req.headers.get('x-forwarded-for');
  return (xf ? xf.split(',')[0] : req.headers.get('x-real-ip') ?? '').trim() || 'desconocida';
}

/** Respuesta 429 estándar. */
export function respuesta429(r: Extract<ResultadoLimite, { ok: false }>): Response {
  return Response.json({ codigo: 'demasiadas_peticiones', mensaje: `Demasiadas peticiones. Intenta en ${r.reintentarEnS} s.` }, { status: 429, headers: { 'Retry-After': String(r.reintentarEnS) } });
}

export const LIMITES = {
  /** Subidas de PDF por usuario. */
  imports: { max: 20, ventanaMs: 10 * 60_000 },
  /** Enlaces de acceso por correo. */
  acceso: { max: 5, ventanaMs: 15 * 60_000 },
  /** Reportes de problema por usuario. */
  reporte: { max: 3, ventanaMs: 60 * 60_000 },
  /** Errores reportados por el cliente, por IP. */
  errores: { max: 30, ventanaMs: 10 * 60_000 },
  /** Notificaciones desde el teléfono, por dispositivo. */
  notificaciones: { max: 120, ventanaMs: 60_000 },
  /** Suscripciones push por usuario. */
  push: { max: 10, ventanaMs: 10 * 60_000 },
} as const;
