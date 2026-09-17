import { contexto } from '@/lib/data/contexto';
import { MODO_MOCK } from '@/lib/supabase/env';
import { Ajustes } from '@/components/ajustes/Ajustes';
import { gmailConfigurado } from '@/lib/services/gmail';

export const metadata = { title: 'Ajustes · MoneyMaker' };
export const dynamic = 'force-dynamic';

export default async function AjustesPage({ searchParams }: { searchParams: { sec?: string; gmail?: string; nuevos?: string } }) {
  const { usuario, repo, perfil } = await contexto();
  const links = await repo.links(usuario.id);
  const aviso = searchParams.gmail === 'ok' ? `Gmail conectado. Leímos ${searchParams.nuevos ?? 0} movimientos de tus alertas.` : searchParams.gmail === 'error' ? 'No pudimos conectar Gmail. Intenta de nuevo.' : searchParams.gmail === 'noconfig' ? 'Falta configurar el acceso de Google.' : null;
  return <Ajustes usuario={usuario} perfil={perfil} links={links} seccionInicial={searchParams.sec} modoMock={MODO_MOCK} gmailConfigurado={gmailConfigurado()} aviso={aviso} />;
}
