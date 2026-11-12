import { contexto } from '@/lib/data/contexto';
import { respuestaDeReglas } from '@/lib/domain/telegram';
import { formatMXN } from '@/lib/format';
import { datosDelBot } from '@/lib/services/telegram';
import { Billy } from '@/components/billy/Billy';

export const metadata = { title: 'Billy · MoneyMaker' };
export const dynamic = 'force-dynamic';

/** Billy: el asistente de la app. Abre contestando solo "¿cuánto me queda?" con las cifras de Presupuesto. */
export default async function BillyPage() {
  const { usuario, repo, perfil } = await contexto();
  const datos = await datosDelBot(repo, usuario.id).catch(() => null);
  const nombre = (perfil.nombre ?? '').trim().split(' ')[0];
  const saludo = `${nombre ? `Hola, ${nombre}. ` : 'Hola. '}Soy Billy. ${datos ? respuestaDeReglas('queda', datos, formatMXN) : 'Ahorita no pude leer tus datos; pregúntame en un momento.'}`;
  return <Billy saludo={saludo} />;
}
