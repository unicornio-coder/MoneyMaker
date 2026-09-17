import { contexto } from '@/lib/data/contexto';
import { aISO, sumarMeses } from '@/lib/domain/fechas';
import { mesDe, enRango } from '@/lib/domain/quincena';
import { costoMensual } from '@/lib/domain/recurrentes';
import { Patrimonio } from '@/components/patrimonio/Patrimonio';

export const metadata = { title: 'Patrimonio · MoneyMaker' };
export const dynamic = 'force-dynamic';

export default async function PatrimonioPage() {
  const { usuario, repo } = await contexto();
  const hoy = new Date();
  const [activos, pasivos, cuentas, movs, recs] = await Promise.all([repo.activos(usuario.id), repo.pasivos(usuario.id), repo.cuentas(usuario.id), repo.movimientos(usuario.id, { desde: aISO(sumarMeses(hoy, -1)) }), repo.recurrentes(usuario.id)]);

  // P&L del mes en curso
  const mes = mesDe(hoy);
  const enMes = movs.filter((m) => enRango(m.fecha, mes));
  const ingresos = enMes.filter((m) => m.tipo === 'ingreso').reduce((s, m) => s + m.monto, 0);
  const fijos = enMes.filter((m) => m.tipo === 'gasto' && m.recurrenteId).reduce((s, m) => s + m.monto, 0);
  const variables = enMes.filter((m) => m.tipo === 'gasto' && !m.recurrenteId).reduce((s, m) => s + m.monto, 0);
  const ahorro = enMes.filter((m) => m.tipo === 'transferencia' && m.categoriaId === 'inversion').reduce((s, m) => s + m.monto, 0);
  const fijosEsperados = recs.filter((r) => r.activo).reduce((s, r) => s + (r.tipo === 'msi' ? r.monto : costoMensual(r)), 0);

  return <Patrimonio activos={activos} pasivos={pasivos} cuentas={cuentas} pnl={{ mes: mes.etiqueta, ingresos, fijos, variables, ahorro, fijosEsperados }} />;
}
