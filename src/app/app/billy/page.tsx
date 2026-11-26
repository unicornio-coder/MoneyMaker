import { contexto } from '@/lib/data/contexto';
import { respuestaDeReglas } from '@/lib/domain/telegram';
import { formatMXN } from '@/lib/format';
import { datosDelBot } from '@/lib/services/telegram';
import { Billy } from '@/components/billy/Billy';

export const metadata = { title: 'Billy · MoneyMaker' };
export const dynamic = 'force-dynamic';

/** Billy: el asistente de la app. Abre contestando solo "¿cuánto me queda?" con las cifras de Presupuesto. */
const PREGUNTAS: Record<string, string> = { suscripciones: '¿Cuánto pago de suscripciones?', cobros: '¿Qué cobros vienen esta semana?' };

export default async function BillyPage({ searchParams }: { searchParams: { p?: string } }) {
  const { usuario, repo, perfil } = await contexto();
  const datos = await datosDelBot(repo, usuario.id).catch(() => null);
  const nombre = (perfil.nombre ?? '').trim().split(' ')[0];
  const hola = nombre ? `Hola, ${nombre}. ` : 'Hola. ';
  const hayDatos = !!datos?.hayDatos;
  // Sin movimientos: Billy explica qué puede hacer y pide el estado de cuenta ahí mismo (clip o ejemplo). Con datos: contesta "¿cuánto me queda?" de entrada.
  const saludo = !datos
    ? `${hola}Soy Billy. Ahorita no pude leer tus datos; pregúntame en un momento.`
    : hayDatos
      ? `${hola}Soy Billy. ${respuestaDeReglas('queda', datos, formatMXN)}`
      : `${hola}Soy Billy. Todavía no tengo movimientos tuyos. Pásame aquí tu estado de cuenta y te digo cuánto te queda de la quincena, cuánto pagas de suscripciones y qué cobros vienen esta semana.`;
  // Lo que Billy sabe: las mismas tres cifras que contesta, para comprobarlas contra Presupuesto y Suscripciones.
  const resumen = datos && hayDatos
    ? { teQueda: datos.teQueda, diasRestantes: datos.diasRestantes, periodoActual: datos.periodoActual, periodo: datos.periodo, totalSuscripciones: datos.totalSuscripciones, nSuscripciones: datos.suscripciones.length, totalProximosCobros: datos.totalProximosCobros, nCobros: datos.proximosCobros.length }
    : null;
  // Solo preguntas conocidas desde el enlace (Inicio); "cuánto me queda" ya viene en el saludo.
  const preguntaInicial = hayDatos && searchParams.p ? PREGUNTAS[searchParams.p] : undefined;
  return <Billy saludo={saludo} hayDatos={hayDatos} resumen={resumen} preguntaInicial={preguntaInicial} />;
}
