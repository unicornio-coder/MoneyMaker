import { contexto } from '@/lib/data/contexto';
import { aISO, sumarMeses, hoyMX } from '@/lib/domain/fechas';
import { Gastos } from '@/components/gastos/Gastos';

export const metadata = { title: 'Gastos · MoneyMaker' };
export const dynamic = 'force-dynamic';

export default async function GastosPage({ searchParams }: { searchParams: { cuenta?: string; cat?: string; q?: string } }) {
  const { usuario, repo } = await contexto();
  const hoy = hoyMX();
  const [cuentas, movimientos] = await Promise.all([repo.cuentas(usuario.id), repo.movimientos(usuario.id, { desde: aISO(sumarMeses(hoy, -13)) })]);
  return <Gastos cuentas={cuentas} movimientos={movimientos} hoy={aISO(hoy)} cuentaInicial={searchParams.cuenta} categoriaInicial={searchParams.cat} busquedaInicial={searchParams.q} />;
}
