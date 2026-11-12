'use server';

import { contexto } from '@/lib/data/contexto';
import { limitarPeticion } from '@/lib/server/ratelimit';
import { datosDelBot, responderPregunta } from '@/lib/services/telegram';

/** Billy dentro de la app: misma lógica que el bot de Telegram, con la sesión del usuario. No guarda la pregunta. */
export async function preguntarABilly(pregunta: string): Promise<{ texto: string }> {
  const { usuario, repo } = await contexto();
  const texto = pregunta.trim().slice(0, 500);
  if (!texto) return { texto: 'Escribe tu pregunta y te contesto con tus cifras.' };
  const lim = limitarPeticion(`billy:${usuario.id}`, { max: 30, ventanaMs: 10 * 60_000 });
  if (!lim.ok) return { texto: `Dame un respiro: vuelve a preguntar en ${Math.ceil(lim.reintentarEnS / 60)} min.` };
  try {
    const inicio = Date.now();
    const datos = await datosDelBot(repo, usuario.id);
    const r = await responderPregunta(texto, datos);
    await repo.registrarEvento(usuario.id, 'billy_respuesta', { intencion: r.intencion, origen: r.origen, cifras_descartadas: r.descartada.length, ms: Date.now() - inicio }).catch(() => undefined);
    return { texto: r.texto };
  } catch (e) {
    console.warn('[billy]', e instanceof Error ? e.message.slice(0, 120) : 'error');
    return { texto: 'No pude consultar tus datos en este momento. Intenta de nuevo en un minuto.' };
  }
}
