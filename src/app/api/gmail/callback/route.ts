import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { contexto } from '@/lib/data/contexto';
import { intercambiarCodigo, sincronizarGmail } from '@/lib/services/gmail';
import { registrar } from '@/lib/services/analytics';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const volver = (q: string) => NextResponse.redirect(`${url.origin}/app/ajustes?sec=fuentes&${q}`);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const esperado = cookies().get('mm-gmail-state')?.value;
  // Cada salida lleva el motivo para que Ajustes diga qué pasó y qué hacer, en vez de un "intenta de nuevo" genérico.
  const fallo = (motivo: string) => {
    console.warn('[gmail] callback', motivo);
    return volver(`gmail=error&motivo=${motivo}`);
  };
  const errorGoogle = url.searchParams.get('error');
  if (errorGoogle) return fallo(errorGoogle === 'access_denied' ? 'denegado' : 'google');
  if (!code || !state || state !== esperado) return fallo('sesion');
  try {
    const { usuario, repo } = await contexto();
    const t = await intercambiarCodigo(code);
    await repo.guardarCredencial(usuario.id, { proveedor: 'gmail', etiqueta: t.email, datos: { refresh_token: t.refresh_token, email: t.email, procesados: [] } });
    await repo.guardarLink(usuario.id, { proveedor: 'gmail', externalId: t.email, institucion: 'Gmail', institucionDominio: 'gmail.com', estado: 'pendiente' });
    await registrar(repo, usuario.id, 'fuente_conectada', { proveedor: 'gmail' });
    const r = await sincronizarGmail(repo, usuario.id, 30);
    return volver(`gmail=ok&nuevos=${r.insertados}`);
  } catch (e) {
    const m = e instanceof Error ? e.message : '';
    return fallo(m.includes('refresh_token') ? 'sin_refresh' : m.startsWith('Google token') ? 'intercambio' : 'lectura');
  }
}
