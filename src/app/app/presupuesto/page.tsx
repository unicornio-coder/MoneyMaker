import { contexto } from '@/lib/data/contexto';
import { aISO, deISO, hoyMX, sumarMeses } from '@/lib/domain/fechas';
import { ultimoRangoConDatos } from '@/lib/domain/series';
import { proponerPresupuesto } from '@/lib/domain/presupuesto';
import { estimarIngresoQuincenal } from '@/lib/services/ingest';
import type { Periodo, Presupuesto as PresupuestoT } from '@/lib/domain/tipos';
import { Presupuesto } from '@/components/presupuesto/Presupuesto';

export const metadata = { title: 'Presupuesto · MoneyMaker' };
export const dynamic = 'force-dynamic';

export default async function PresupuestoPage() {
  const { usuario, repo, diasPago, perfil } = await contexto();
  const hoy = hoyMX();
  const [movimientos, recurrentes] = await Promise.all([repo.movimientos(usuario.id, { desde: aISO(sumarMeses(hoy, -13)) }), repo.recurrentes(usuario.id)]);
  const ingresoQ = perfil.ingresoQuincenal ?? estimarIngresoQuincenal(movimientos);

  // Asegura un presupuesto para el periodo actual de cada vista; si no existe, lo proponemos con los datos.
  // Si el periodo actual no tiene movimientos (los estados de cuenta terminan antes), se muestra el último con datos.
  const presupuestos: Record<Periodo, PresupuestoT | null> = { q: null, mes: null, anio: null };
  const rangos: Record<Periodo, { inicio: string; fin: string; actual: boolean }> = { q: { inicio: '', fin: '', actual: true }, mes: { inicio: '', fin: '', actual: true }, anio: { inicio: '', fin: '', actual: true } };
  for (const periodo of ['q', 'mes', 'anio'] as Periodo[]) {
    const { rango, actual } = ultimoRangoConDatos(movimientos, periodo, hoy, diasPago);
    rangos[periodo] = { inicio: rango.inicio, fin: rango.fin, actual };
    let p = await repo.presupuesto(usuario.id, periodo, rango.inicio);
    if (!p && movimientos.length) {
      const lineas = proponerPresupuesto(movimientos, recurrentes, periodo, deISO(rango.fin), diasPago);
      const ingreso = periodo === 'q' ? ingresoQ : periodo === 'mes' ? ingresoQ * 2 : ingresoQ * 24;
      p = await repo.guardarPresupuesto(usuario.id, { periodo, inicio: rango.inicio, fin: rango.fin, ingreso, lineas });
    }
    presupuestos[periodo] = p;
  }

  return <Presupuesto presupuestos={presupuestos} rangos={rangos} movimientos={movimientos} diasPago={diasPago} hoy={aISO(hoy)} />;
}
