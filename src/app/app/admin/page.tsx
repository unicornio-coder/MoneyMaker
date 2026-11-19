import { notFound } from 'next/navigation';
import { contexto } from '@/lib/data/contexto';
import { esAdmin, haceCuanto } from '@/lib/domain/backoffice';
import { pluralize } from '@/lib/format';
import { datosBackoffice } from '@/lib/services/backoffice';

export const metadata = { title: 'Back office · MoneyMaker', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

function Total({ titulo, valor, nota }: { titulo: string; valor: number; nota?: string }) {
  return (
    <div className="card px-[18px] py-[15px]">
      <p className="text-[12px] font-semibold text-txt-2 dark:text-fg-2">{titulo}</p>
      <p className="mt-1 font-display text-[26px] font-extrabold tracking-[-0.5px]">{valor.toLocaleString('es-MX')}</p>
      {nota && <p className="mt-0.5 text-[11.5px] text-txt-2 dark:text-fg-2">{nota}</p>}
    </div>
  );
}

function Prueba() {
  return <span className="ml-2 rounded-pill bg-bg-chip px-2 py-0.5 text-[10.5px] font-semibold text-txt-2 dark:bg-surface-2 dark:text-fg-2">Prueba</span>;
}

/**
 * Back office: quiénes son los usuarios y qué están haciendo. Solo para los correos de ADMIN_EMAILS;
 * para cualquier otra persona la ruta no existe. No muestra montos ni movimientos de nadie.
 */
export default async function AdminPage() {
  const { usuario } = await contexto();
  if (!esAdmin(usuario.email, process.env.ADMIN_EMAILS)) notFound();
  const ahora = new Date();
  const r = await datosBackoffice(ahora);

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <header>
        <h1 className="font-display text-[22px] font-extrabold tracking-[-0.4px]">Back office</h1>
        <p className="mt-1 text-[13px] text-txt-2 dark:text-fg-2">Usuarios y actividad de los últimos 30 días. Los totales no cuentan las cuentas de prueba. Aquí no se muestran montos ni movimientos.</p>
      </header>

      <section aria-label="Totales" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Total titulo="Usuarios" valor={r.usuarios} nota={`${pluralize(r.nuevos7d, 'nuevo', 'nuevos')} en 7 días`} />
        <Total titulo="Activos en 7 días" valor={r.activos7d} />
        <Total titulo="Terminaron el onboarding" valor={r.onboarding} />
        <Total titulo="Subieron un archivo" valor={r.conArchivo} />
        <Total titulo="Archivos con error en 7 días" valor={r.archivosConError7d} />
        <Total titulo="Preguntas a Billy en 7 días" valor={r.preguntasBilly7d} />
        <Total titulo="Preguntas sospechosas a Billy" valor={r.preguntasSospechosas7d} nota="Intentos de cambiarle las reglas, 7 días" />
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-[19px] font-bold tracking-[-0.3px]">Usuarios</h2>
        {r.filas.length === 0 ? (
          <p className="card px-5 py-8 text-center text-[13px] text-txt-2 dark:text-fg-2">Todavía no hay usuarios registrados.</p>
        ) : (
          <div className="card overflow-x-auto p-0">
            <table className="w-full min-w-[720px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-edge text-[11.5px] font-semibold text-txt-2 dark:text-fg-2">
                  <th scope="col" className="px-4 py-3">Usuario</th>
                  <th scope="col" className="px-4 py-3">Se registró</th>
                  <th scope="col" className="px-4 py-3">Onboarding</th>
                  <th scope="col" className="px-4 py-3 text-right">Archivos</th>
                  <th scope="col" className="px-4 py-3">Lo último que hizo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge">
                {r.filas.map((f) => (
                  <tr key={f.id}>
                    <td className="px-4 py-3">
                      <span className="font-semibold">{f.nombre?.trim() || 'Sin nombre'}</span>
                      {f.prueba && <Prueba />}
                      <span className="block text-[12px] text-txt-2 dark:text-fg-2">{f.email}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">{haceCuanto(f.creado, ahora)}</td>
                    <td className="px-4 py-3">{f.onboardingCompleto ? 'Completo' : 'Sin terminar'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      {f.archivos}
                      {f.archivosConError > 0 && <span className="block text-[11.5px] text-negative">{f.archivosConError} con error</span>}
                    </td>
                    <td className="px-4 py-3">
                      {f.ultimoEvento ?? 'Sin actividad en 30 días'}
                      {f.ultimaActividad && <span className="block text-[12px] text-txt-2 dark:text-fg-2">{haceCuanto(f.ultimaActividad, ahora)}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-[19px] font-bold tracking-[-0.3px]">Actividad reciente</h2>
        {r.actividad.length === 0 ? (
          <p className="card px-5 py-8 text-center text-[13px] text-txt-2 dark:text-fg-2">Sin eventos en los últimos 30 días.</p>
        ) : (
          <ul className="card divide-y divide-edge p-0">
            {r.actividad.map((e, i) => (
              <li key={`${e.cuando}-${i}`} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 px-4 py-3 text-[13px]">
                <span>
                  <span className="font-semibold">{e.nombre}</span>
                  <span className="ml-2 text-txt-2 dark:text-fg-2">{e.email ?? 'Sin sesión'}</span>
                  {e.prueba && <Prueba />}
                </span>
                <span className="whitespace-nowrap text-[12px] text-txt-2 dark:text-fg-2">{haceCuanto(e.cuando, ahora)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
