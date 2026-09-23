// Trabajo que sigue después de responder. En Vercel, waitUntil mantiene viva la función hasta que termine;
// en Node local la promesa ya está corriendo y termina sola.

import { waitUntil } from '@vercel/functions';

export function enSegundoPlano(tarea: Promise<unknown>): void {
  const p = tarea.catch((e) => console.error('[segundo-plano]', e instanceof Error ? e.name : 'error'));
  try {
    waitUntil(p);
  } catch {
    // Fuera de Vercel no hay contexto de request: la promesa sigue por su cuenta.
  }
}
