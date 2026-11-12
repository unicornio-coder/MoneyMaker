import { contexto } from '@/lib/data/contexto';
import { getAggregator } from '@/lib/services/aggregator';
import { posicionesMock, seriesMock } from '@/lib/mock/cuentas';
import { aISO, sumarMeses, hoyMX } from '@/lib/domain/fechas';
import { Inicio } from '@/components/inicio/Inicio';
import { datosDelBot, telegramConfigurado } from '@/lib/services/telegram';
import type { CuentaVista, DatosInicio } from '@/components/inicio/tipos';

export const metadata = { title: 'Inicio · MoneyMaker' };
export const dynamic = 'force-dynamic';

export default async function InicioPage({ searchParams }: { searchParams: { cuenta?: string } }) {
  const { usuario, repo, diasPago } = await contexto();
  const hoy = hoyMX();
  const desde = aISO(sumarMeses(hoy, -7));
  const agg = getAggregator();
  const credBitso = await repo.credencial(usuario.id, 'bitso').catch(() => null);
  const posBitso = (credBitso?.datos.posiciones as { ticker: string; nombre: string; dominio: string; cantidad: number; valor: number; variacion: number }[] | undefined) ?? null;
  const [cuentasBase, movimientos, recurrentes, objetivos, instituciones, links] = await Promise.all([
    repo.cuentas(usuario.id),
    repo.movimientos(usuario.id, { desde }),
    repo.recurrentes(usuario.id),
    repo.objetivos(usuario.id),
    agg.listarInstituciones().catch(() => []),
    repo.links(usuario.id),
  ]);

  const cuentas: CuentaVista[] = cuentasBase.map((c) => {
    const ext = (c as CuentaVista).externalId ?? null;
    if (c.tipo !== 'inversion') return { ...c, externalId: ext, inversion: null };
    const movsCuenta = movimientos.filter((m) => m.cuentaId === c.id);
    const aportado = movsCuenta.filter((m) => m.tipo === 'gasto' || m.tipo === 'transferencia').reduce((s, m) => s + m.monto, 0);
    const rendMes = movsCuenta.filter((m) => m.tipo === 'ingreso' && m.fecha >= aISO(sumarMeses(hoy, -1))).reduce((s, m) => s + m.monto, 0);
    const serie = (ext && seriesMock[ext]) || Array.from({ length: 11 }, (_, i) => c.saldo * (0.9 + (i / 10) * 0.1));
    const posiciones = (c.banco === 'Bitso' && posBitso) || (ext && posicionesMock[ext]) || [];
    const rendimiento = rendMes > 0 ? `+$${Math.round(rendMes).toLocaleString('es-MX')} este mes` : serie.length > 1 ? `${(((serie[serie.length - 1] - serie[0]) / serie[0]) * 100).toFixed(1)} % en 30 días` : '';
    return { ...c, externalId: ext, inversion: { serie, posiciones, rendimiento, aportado } };
  });

  // Misma cuenta que Presupuesto y que el bot: así Inicio contesta "¿cuánto me queda?" sin tener que entrar a otra pestaña.
  const q = await datosDelBot(repo, usuario.id, hoy).catch(() => null);
  const datos: DatosInicio = {
    cuentas,
    movimientos,
    recurrentes,
    objetivos,
    diasPago,
    hoy: aISO(hoy),
    instituciones,
    agregador: agg.nombre,
    sandbox: agg.entorno === 'sandbox',
    invitarTelegram: telegramConfigurado() ? !(await repo.chatDeTelegram(usuario.id).catch(() => 'x')) : false,
    quincena: q && q.hayDatos && q.limite > 0 ? { teQueda: q.teQueda, diasRestantes: q.diasRestantes, periodoActual: q.periodoActual, periodo: q.periodo } : null,
    fuentes: links.map((l) => ({ id: l.id, proveedor: l.proveedor, institucion: l.institucion, estado: l.estado })),
  };
  return <Inicio datos={datos} cuentaInicial={searchParams.cuenta ?? null} />;
}
