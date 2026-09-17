import { contexto } from '@/lib/data/contexto';
import { MODO_MOCK } from '@/lib/supabase/env';
import { Ajustes } from '@/components/ajustes/Ajustes';

export const metadata = { title: 'Ajustes · MoneyMaker' };
export const dynamic = 'force-dynamic';

export default async function AjustesPage({ searchParams }: { searchParams: { sec?: string } }) {
  const { usuario, repo, perfil } = await contexto();
  const links = await repo.links(usuario.id);
  return <Ajustes usuario={usuario} perfil={perfil} links={links} seccionInicial={searchParams.sec} modoMock={MODO_MOCK} />;
}
