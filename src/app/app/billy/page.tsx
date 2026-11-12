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
  const hola = nombre ? `Hola, ${nombre}. ` : 'Hola. ';
  const hayDatos = !!datos?.hayDatos;
  // Sin movimientos: Billy explica qué puede hacer y manda a subir el estado de cuenta. Con datos: contesta "¿cuánto me queda?" de entrada.
  const saludo = !datos
    ? `${hola}Soy Billy. Ahorita no pude leer tus datos; pregúntame en un momento.`
    : hayDatos
      ? `${hola}Soy Billy. ${respuestaDeReglas('queda', datos, formatMXN)}`
      : `${hola}Soy Billy. Todavía no tengo movimientos tuyos. En cuanto subas un estado de cuenta te digo cuánto te queda de la quincena, cuánto pagas de suscripciones y qué cobros vienen esta semana.`;
  return <Billy saludo={saludo} hayDatos={hayDatos} />;
}
