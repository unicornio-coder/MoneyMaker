'use server';

import { contexto } from '@/lib/data/contexto';
import { enviarCorreo, correoConfigurado } from '@/lib/services/correo';
import { registrar } from '@/lib/services/analytics';
import { limitarPeticion, LIMITES } from '@/lib/server/ratelimit';
import { registrarExcepcion } from '@/lib/server/errores';

export type ResultadoReporte = { ok: true; via: 'issue' | 'correo' | 'guardado'; url?: string } | { ok: false; error: string };

const VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.1.0';
const BUILD = (process.env.VERCEL_GIT_COMMIT_SHA ?? '').slice(0, 7);

/** Abre un issue en GitHub con GITHUB_ISSUES_TOKEN (permiso issues:write) y GITHUB_REPO ("dueño/repo"). */
async function abrirIssue(titulo: string, cuerpo: string): Promise<string | null> {
  const token = process.env.GITHUB_ISSUES_TOKEN;
  const repo = process.env.GITHUB_REPO;
  if (!token || !repo) return null;
  const res = await fetch(`https://api.github.com/repos/${repo}/issues`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json', 'User-Agent': 'moneymaker-app' },
    body: JSON.stringify({ title: titulo, body: cuerpo, labels: ['reporte'] }),
  });
  if (!res.ok) throw new Error(`GitHub ${res.status}`);
  const data = (await res.json()) as { html_url?: string };
  return data.html_url ?? null;
}

/**
 * Reporte de problema desde el centro de ayuda. Sin humanos: abre un issue (si hay token), si no manda un correo
 * (si hay Resend) y, si tampoco, queda como evento. El issue no lleva el correo del usuario: solo un id corto.
 */
export async function reportarProblema(asunto: string, detalle: string, pantalla: string): Promise<ResultadoReporte> {
  const { usuario, repo } = await contexto();
  const a = asunto.trim().slice(0, 120);
  const d = detalle.trim().slice(0, 2000);
  if (a.length < 4) return { ok: false, error: 'Escribe en pocas palabras qué pasó.' };
  if (d.length < 10) return { ok: false, error: 'Cuéntanos un poco más: qué hiciste, qué esperabas y qué viste.' };
  const l = limitarPeticion(`reporte:${usuario.id}`, LIMITES.reporte);
  if (!l.ok) return { ok: false, error: `Ya recibimos varios reportes tuyos. Intenta en ${Math.ceil(l.reintentarEnS / 60)} min.` };

  const idCorto = usuario.id.slice(0, 8);
  const cuerpo = [`**Pantalla:** ${pantalla.slice(0, 120) || 'no indicada'}`, `**Versión:** ${VERSION}${BUILD ? ` · build ${BUILD}` : ''}`, `**Usuario:** ${idCorto}…`, '', d].join('\n');
  try {
    const url = await abrirIssue(`[reporte] ${a}`, cuerpo);
    if (url) {
      await registrar(repo, usuario.id, 'reporte_problema', { via: 'issue' });
      return { ok: true, via: 'issue', url };
    }
  } catch (e) {
    await registrarExcepcion('ayuda/issue', e, { userId: usuario.id });
  }
  if (correoConfigurado()) {
    const r = await enviarCorreo({ para: process.env.SOPORTE_CORREO || 'hola@moneymaker.mx', responderA: usuario.email, asunto: `[reporte] ${a}`, texto: `${cuerpo}\n\nResponder a: ${usuario.email}` });
    if (r.ok) {
      await registrar(repo, usuario.id, 'reporte_problema', { via: 'correo' });
      return { ok: true, via: 'correo' };
    }
  }
  await registrar(repo, usuario.id, 'reporte_problema', { via: 'guardado', asunto: a });
  return { ok: true, via: 'guardado' };
}
