import { contexto } from '@/lib/data/contexto';
import { getAggregator } from '@/lib/services/aggregator';
import { posicionesMock, seriesMock } from '@/lib/mock/cuentas';
import { aISO, sumarMeses } from '@/lib/domain/fechas';
import { Inversiones } from '@/components/inversiones/Inversiones';
import type { CuentaVista } from '@/components/inicio/tipos';

export const metadata = { title: 'Inversiones · MoneyMaker' };
export const dynamic = 'force-dynamic';

export default async function InversionesPage() {
  const { usuario, repo } = await contexto();
  const hoy = new Date();
  const agg = getAggregator();
  const credBitso = await repo.credencial(usuario.id, 'bitso').catch(() => null);
  const posBitso = (credBitso?.datos.posiciones as { ticker: string; nombre: string; dominio: string; cantidad: number; valor: number; variacion: number }[] | undefined) ?? null;
  const [cuentasBase, movimientos, instituciones] = await Promise.all([repo.cuentas(usuario.id), repo.movimientos(usuario.id, { desde: aISO(sumarMeses(hoy, -12)) }), agg.listarInstituciones().catch(() => [])]);
  const cuentas: CuentaVista[] = cuentasBase
    .filter((c) => c.tipo === 'inversion')
    .map((c) => {
      const ext = (c as CuentaVista).externalId ?? null;
      const movs = movimientos.filter((m) => m.cuentaId === c.id);
      const aportado = movs.filter((m) => m.tipo === 'transferencia' || m.tipo === 'gasto').reduce((s, m) => s + m.monto, 0);
      const rendMes = movs.filter((m) => m.tipo === 'ingreso' && m.fecha >= aISO(sumarMeses(hoy, -1))).reduce((s, m) => s + m.monto, 0);
      const serie = (ext && seriesMock[ext]) || Array.from({ length: 11 }, (_, i) => c.saldo * (0.9 + (i / 10) * 0.1));
      const rendimiento = rendMes > 0 ? `+${Math.round(rendMes).toLocaleString('es-MX')} este mes` : `${(((serie[serie.length - 1] - serie[0]) / (serie[0] || 1)) * 100).toFixed(1)} % en 30 días`;
      return { ...c, externalId: ext, inversion: { serie, posiciones: (c.banco === 'Bitso' && posBitso) || (ext && posicionesMock[ext]) || [], rendimiento, aportado } };
    });
  return <Inversiones cuentas={cuentas} movimientos={movimientos} instituciones={instituciones.filter((i) => i.tipo === 'inversion' || ['GBM+', 'Bitso', 'CetesDirecto', 'Kuspit'].includes(i.nombre))} agregador={agg.nombre} hoy={aISO(hoy)} />;
}
