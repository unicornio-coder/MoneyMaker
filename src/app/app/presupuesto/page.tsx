import { contexto } from '@/lib/data/contexto';
import { aISO, sumarMeses } from '@/lib/domain/fechas';
import { rangoDe } from '@/lib/domain/quincena';
import { proponerPresupuesto } from '@/lib/domain/presupuesto';
import { estimarIngresoQuincenal } from '@/lib/services/ingest';
import type { Periodo, Presupuesto as PresupuestoT } from '@/lib/domain/tipos';
import { Presupuesto } from '@/components/presupuesto/Presupuesto';

export const metadata = { title: 'Presupuesto · MoneyMaker' };
export const dynamic = 'force-dynamic';

export default async function PresupuestoPage() {
  const { usuario, repo, diasPago, perfil } = await contexto();
  const hoy = new Date();
  const [movimientos, recurrentes] = await Promise.all([repo.movimientos(usuario.id, { desde: aISO(sumarMeses(hoy, -13)) }), repo.recurrentes(usuario.id)]);
  const ingresoQ = perfil.ingresoQuincenal ?? estimarIngresoQuincenal(movimientos);

  // Asegura un presupuesto para el periodo actual de cada vista; si no existe, lo proponemos con los datos.
  const presupuestos: Record<Periodo, PresupuestoT | null> = { q: null, mes: null, anio: null };
  for (const periodo of ['q', 'mes', 'anio'] as Periodo[]) {
    const rango = rangoDe(periodo, hoy, diasPago);
    let p = await repo.presupuesto(usuario.id, periodo, rango.inicio);
    if (!p && movimientos.length) {
      const lineas = proponerPresupuesto(movimientos, recurrentes, periodo, hoy, diasPago);
      const ingreso = periodo === 'q' ? ingresoQ : periodo === 'mes' ? ingresoQ * 2 : ingresoQ * 24;
      p = await repo.guardarPresupuesto(usuario.id, { periodo, inicio: rango.inicio, fin: rango.fin, ingreso, lineas });
    }
    presupuestos[periodo] = p;
  }

  return <Presupuesto presupuestos={presupuestos} movimientos={movimientos} diasPago={diasPago} hoy={aISO(hoy)} />;
}
