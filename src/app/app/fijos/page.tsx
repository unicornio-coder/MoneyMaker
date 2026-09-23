import { contexto } from '@/lib/data/contexto';
import { aISO, sumarMeses, hoyMX } from '@/lib/domain/fechas';
import { Fijos } from '@/components/fijos/Fijos';

export const metadata = { title: 'Gastos fijos · MoneyMaker' };
export const dynamic = 'force-dynamic';

export default async function FijosPage({ searchParams }: { searchParams: { r?: string; sec?: string; vista?: string; pago?: string } }) {
  const { usuario, repo, perfil } = await contexto();
  const hoy = hoyMX();
  const [recurrentes, eventos, cuentas] = await Promise.all([
    repo.recurrentes(usuario.id),
    repo.eventos(usuario.id, aISO(sumarMeses(hoy, -1)), aISO(sumarMeses(hoy, 2))),
    repo.cuentas(usuario.id),
  ]);
  const ingresoMensual = (perfil.ingresoQuincenal ?? 0) * 2;
  return (
    <Fijos
      recurrentes={recurrentes}
      eventos={eventos}
      cuentas={cuentas.map((c) => ({ id: c.id, nombre: c.nombre, bancoDominio: c.bancoDominio ?? null, fechaLimite: c.fechaLimite ?? null, tipo: c.tipo, saldo: c.saldo }))}
      ingresoMensual={ingresoMensual}
      hoy={aISO(hoy)}
      inicial={{ recurrenteId: searchParams.r, seccion: searchParams.sec, vista: searchParams.vista, pagoCuentaId: searchParams.pago }}
    />
  );
}
