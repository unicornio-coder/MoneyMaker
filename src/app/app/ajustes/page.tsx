import { contexto } from '@/lib/data/contexto';
import { MODO_MOCK } from '@/lib/supabase/env';
import { Ajustes } from '@/components/ajustes/Ajustes';
import { gmailConfigurado } from '@/lib/services/gmail';
import { outlookConfigurado } from '@/lib/services/outlook';

export const metadata = { title: 'Ajustes · MoneyMaker' };
export const dynamic = 'force-dynamic';

export default async function AjustesPage({ searchParams }: { searchParams: { sec?: string; gmail?: string; outlook?: string; nuevos?: string } }) {
  const { usuario, repo, perfil } = await contexto();
  const links = await repo.links(usuario.id);
  const avisoDe = (nombre: string, estado?: string) => (estado === 'ok' ? `${nombre} conectado. Leímos ${searchParams.nuevos ?? 0} movimientos de tus alertas.` : estado === 'error' ? `No pudimos conectar ${nombre}. Intenta de nuevo.` : estado === 'noconfig' ? `Falta configurar el acceso de ${nombre}.` : null);
  const aviso = avisoDe('Gmail', searchParams.gmail) ?? avisoDe('Outlook', searchParams.outlook);
  return <Ajustes usuario={usuario} perfil={perfil} links={links} seccionInicial={searchParams.sec} modoMock={MODO_MOCK} gmailConfigurado={gmailConfigurado()} outlookConfigurado={outlookConfigurado()} aviso={aviso} />;
}
