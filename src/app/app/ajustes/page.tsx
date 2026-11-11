import { contexto } from '@/lib/data/contexto';
import { MODO_MOCK } from '@/lib/supabase/env';
import { Ajustes } from '@/components/ajustes/Ajustes';
import { gmailConfigurado } from '@/lib/services/gmail';
import { outlookConfigurado } from '@/lib/services/outlook';
import { telegramConfigurado } from '@/lib/services/telegram';
import { nivelPlan } from '@/lib/domain/plan';
import { getAggregator } from '@/lib/services/aggregator';
import type { DiagBelvo } from '@/components/ajustes/Ajustes';

export const metadata = { title: 'Ajustes · MoneyMaker' };
export const dynamic = 'force-dynamic';

/** Qué pasó al conectar el correo y qué puede hacer el usuario. Los motivos los pone /api/gmail/callback. */
function motivoDeError(motivo?: string): string {
  switch (motivo) {
    case 'denegado':
      return 'Cancelaste el permiso en Google, o tu correo no está en la lista de usuarios de prueba de la app.';
    case 'sesion':
      return 'La solicitud venció o se abrió en otro navegador. Vuelve a tocar Conectar desde aquí.';
    case 'dominio':
      return `Abre MoneyMaker desde ${process.env.NEXT_PUBLIC_APP_URL ?? 'la dirección principal'} y conéctalo ahí.`;
    case 'sin_refresh':
      return 'Google ya tenía un permiso anterior. Quita MoneyMaker en myaccount.google.com/permissions y vuelve a conectar.';
    case 'intercambio':
      return 'Google rechazó la respuesta. Revisa que la URL de retorno autorizada en Google Cloud sea la de esta app.';
    case 'lectura':
      return 'El permiso se dio, pero no pudimos leer el buzón. Intenta de nuevo en unos minutos.';
    default:
      return 'Intenta de nuevo.';
  }
}

export default async function AjustesPage({ searchParams }: { searchParams: { sec?: string; gmail?: string; outlook?: string; nuevos?: string; motivo?: string } }) {
  const { usuario, repo, perfil } = await contexto();
  const links = await repo.links(usuario.id);
  const avisoDe = (nombre: string, estado?: string) => (estado === 'ok' ? `${nombre} conectado. Leímos ${searchParams.nuevos ?? 0} movimientos de tus alertas.` : estado === 'error' ? `No pudimos conectar ${nombre}. ${motivoDeError(searchParams.motivo)}` : estado === 'noconfig' ? `Falta configurar el acceso de ${nombre}.` : null);
  const aviso = avisoDe('Gmail', searchParams.gmail) ?? avisoDe('Outlook', searchParams.outlook);
  const telegramVinculado = telegramConfigurado() ? !!(await repo.chatDeTelegram(usuario.id).catch(() => null)) : false;
  const agg = getAggregator();
  // Solo con Belvo real: qué instituciones tiene habilitadas la cuenta (bancos o solo SAT/IMSS). Nunca rompe la pantalla.
  const belvo: DiagBelvo = agg.nombre === 'belvo' ? await agg.diagnostico().then((d) => ({ entorno: d.entorno, hayBancos: d.hayBancos, bancos: d.bancos, porTipo: d.porTipo, mensaje: d.mensaje })).catch((e: unknown) => ({ error: e instanceof Error ? e.message.replace(/[A-Za-z0-9_-]{20,}/g, '…') : 'No respondió.' })) : null;
  return <Ajustes belvo={belvo} usuario={usuario} perfil={perfil} links={links} seccionInicial={searchParams.sec} modoMock={MODO_MOCK} gmailConfigurado={gmailConfigurado()} outlookConfigurado={outlookConfigurado()} telegram={{ configurado: telegramConfigurado(), vinculado: telegramVinculado }} aviso={aviso} nivel={nivelPlan(perfil)} />;
}
