// Correos automáticos del ciclo de vida: bienvenida al terminar el onboarding y "conecta tu banco" a los 2 días
// sin fuentes. Texto y HTML con la paleta; sin datos financieros.

import type { Perfil } from '@/lib/domain/tipos';
import { enviarCorreo, type ResultadoCorreo } from './correo';

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c);
}

function plantilla(titulo: string, parrafos: string[], cta: { texto: string; url: string }, urlApp: string): string {
  return `<!doctype html><html lang="es"><body style="margin:0;background:#F7F8F7;font-family:Inter,Helvetica,Arial,sans-serif;color:#0B1F17">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#fff;border-radius:18px;padding:28px">
<tr><td>
<div style="font-size:12px;font-weight:700;letter-spacing:.9px;text-transform:uppercase;color:#16A34A">MoneyMaker</div>
<h1 style="margin:8px 0 0;font-size:24px;line-height:1.2">${esc(titulo)}</h1>
${parrafos.map((p) => `<p style="margin:14px 0 0;font-size:14px;line-height:1.55;color:#0B1F17">${esc(p)}</p>`).join('')}
<a href="${esc(cta.url)}" style="display:block;margin-top:24px;background:#0B1F17;color:#fff;text-decoration:none;text-align:center;border-radius:11px;padding:14px;font-weight:700;font-size:15px">${esc(cta.texto)}</a>
<p style="margin:18px 0 0;font-size:11px;color:#5f6b67">Nunca pedimos las claves de tu banco. <a href="${esc(urlApp)}/app/ajustes?sec=notificaciones" style="color:#16A34A">Cambiar avisos</a></p>
</td></tr></table></td></tr></table></body></html>`;
}

export function correoBienvenida(perfil: Pick<Perfil, 'email' | 'nombre'>, urlApp: string) {
  const nombre = perfil.nombre?.split(' ')[0];
  const parrafos = [
    `${nombre ? `Hola ${nombre}. ` : ''}Ya tienes MoneyMaker. Tienes 7 días de Plus completo: bancos ilimitados, suscripciones detectadas, cancelación por carta y avisos.`,
    'Lo primero que conviene hacer: conectar un banco o subir el estado de cuenta que ya te manda. En dos minutos ves tus suscripciones y cuánto te queda.',
    'Si algo no cuadra, responde a este correo. Lo leemos.',
  ];
  return {
    asunto: 'Bienvenido a MoneyMaker',
    texto: `${parrafos.join('\n\n')}\n\nIr a mi panel: ${urlApp}/app`,
    html: plantilla('Tu dinero, claro.', parrafos, { texto: 'Ir a mi panel', url: `${urlApp}/app` }, urlApp),
  };
}

export function correoConectaBanco(perfil: Pick<Perfil, 'email' | 'nombre'>, urlApp: string) {
  const nombre = perfil.nombre?.split(' ')[0];
  const parrafos = [
    `${nombre ? `Hola ${nombre}. ` : ''}Todavía no hay ninguna cuenta en tu MoneyMaker, así que no podemos decirte nada útil.`,
    'Conecta tu banco (solo lectura, con Belvo) o sube el PDF de tu estado de cuenta. Lo que tarda: dos minutos.',
    'Si lo que te frena es la seguridad: nunca vemos tu contraseña del banco y el PDF se lee y se descarta.',
  ];
  return {
    asunto: 'Falta un paso: conecta tu banco',
    texto: `${parrafos.join('\n\n')}\n\nConectar: ${urlApp}/app`,
    html: plantilla('Falta un paso.', parrafos, { texto: 'Conectar mi banco', url: `${urlApp}/app` }, urlApp),
  };
}

export async function enviarBienvenida(perfil: Pick<Perfil, 'email' | 'nombre'>, urlApp: string): Promise<ResultadoCorreo> {
  const c = correoBienvenida(perfil, urlApp);
  return enviarCorreo({ para: perfil.email, asunto: c.asunto, texto: c.texto, html: c.html });
}

export async function enviarConectaBanco(perfil: Pick<Perfil, 'email' | 'nombre'>, urlApp: string): Promise<ResultadoCorreo> {
  const c = correoConectaBanco(perfil, urlApp);
  return enviarCorreo({ para: perfil.email, asunto: c.asunto, texto: c.texto, html: c.html });
}
