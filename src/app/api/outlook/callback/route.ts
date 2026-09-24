import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { contexto } from '@/lib/data/contexto';
import { intercambiarCodigoOutlook, sincronizarOutlook } from '@/lib/services/outlook';
import { registrar } from '@/lib/services/analytics';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const volver = (q: string) => NextResponse.redirect(`${url.origin}/app/ajustes?sec=fuentes&${q}`);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const esperado = cookies().get('mm-outlook-state')?.value;
  if (!code || !state || state !== esperado) return volver('outlook=error');
  try {
    const { usuario, repo } = await contexto();
    const t = await intercambiarCodigoOutlook(code);
    await repo.guardarCredencial(usuario.id, { proveedor: 'outlook', etiqueta: t.email, datos: { refresh_token: t.refresh_token, email: t.email, procesados: [] } });
    await repo.guardarLink(usuario.id, { proveedor: 'outlook', externalId: t.email, institucion: 'Outlook', institucionDominio: 'outlook.com', estado: 'pendiente' });
    await registrar(repo, usuario.id, 'fuente_conectada', { proveedor: 'outlook' });
    const r = await sincronizarOutlook(repo, usuario.id, 30);
    return volver(`outlook=ok&nuevos=${r.insertados}`);
  } catch {
    return volver('outlook=error');
  }
}
