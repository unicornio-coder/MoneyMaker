import { contexto } from '@/lib/data/contexto';
import { MODO_MOCK } from '@/lib/supabase/env';
import { Ajustes } from '@/components/ajustes/Ajustes';
import { gmailConfigurado } from '@/lib/services/gmail';
import { outlookConfigurado } from '@/lib/services/outlook';
import { nivelPlan } from '@/lib/domain/plan';
import { getAggregator } from '@/lib/services/aggregator';
import type { DiagBelvo } from '@/components/ajustes/Ajustes';

export const metadata = { title: 'Ajustes · MoneyMaker' };
export const dynamic = 'force-dynamic';

export default async function AjustesPage({ searchParams }: { searchParams: { sec?: string; gmail?: string; outlook?: string; nuevos?: string } }) {
  const { usuario, repo, perfil } = await contexto();
  const links = await repo.links(usuario.id);
  const avisoDe = (nombre: string, estado?: string) => (estado === 'ok' ? `${nombre} conectado. Leímos ${searchParams.nuevos ?? 0} movimientos de tus alertas.` : estado === 'error' ? `No pudimos conectar ${nombre}. Intenta de nuevo.` : estado === 'noconfig' ? `Falta configurar el acceso de ${nombre}.` : null);
  const aviso = avisoDe('Gmail', searchParams.gmail) ?? avisoDe('Outlook', searchParams.outlook);
  const agg = getAggregator();
  // Solo con Belvo real: qué instituciones tiene habilitadas la cuenta (bancos o solo SAT/IMSS). Nunca rompe la pantalla.
  const belvo: DiagBelvo = agg.nombre === 'belvo' ? await agg.diagnostico().then((d) => ({ entorno: d.entorno, hayBancos: d.hayBancos, bancos: d.bancos, porTipo: d.porTipo, mensaje: d.mensaje })).catch((e: unknown) => ({ error: e instanceof Error ? e.message.replace(/[A-Za-z0-9_-]{20,}/g, '…') : 'No respondió.' })) : null;
  return <Ajustes belvo={belvo} usuario={usuario} perfil={perfil} links={links} seccionInicial={searchParams.sec} modoMock={MODO_MOCK} gmailConfigurado={gmailConfigurado()} outlookConfigurado={outlookConfigurado()} aviso={aviso} nivel={nivelPlan(perfil)} />;
}
