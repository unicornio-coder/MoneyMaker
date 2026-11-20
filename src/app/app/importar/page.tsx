import { contexto } from '@/lib/data/contexto';
import { Importar } from '@/components/importar/Importar';

export const metadata = { title: 'Subir estado de cuenta · MoneyMaker' };
export const dynamic = 'force-dynamic';

export default async function ImportarPage({ searchParams }: { searchParams: { banco?: string } }) {
  const { usuario, repo } = await contexto();
  const [cuentas, pendientes] = await Promise.all([repo.cuentas(usuario.id), repo.importaciones(usuario.id, { estados: ['revisar'] })]);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-[22px] font-bold tracking-[-0.4px]">Sube tu estado de cuenta</h1>
        <p className="text-[13px] text-txt-2 dark:text-fg-2">En dos minutos ves qué pagas cada mes y cuánto te sobra en la quincena.</p>
        <p className="mt-1 text-[12.5px] text-txt-2 dark:text-fg-2">¿Quieres probar sin tu estado de cuenta? Descarga un ejemplo de <a href="/ejemplos/ejemplo-debito-nomina.pdf" download className="font-bold text-green-dark underline dark:text-green-light">cuenta de nómina</a> o de <a href="/ejemplos/ejemplo-tarjeta-de-credito-1.pdf" download className="font-bold text-green-dark underline dark:text-green-light">tarjeta de crédito</a> y súbelo.</p>
      </div>
      <Importar cuentas={cuentas.map((c) => ({ id: c.id, nombre: c.nombre, banco: c.banco, tipo: c.tipo, ultimos4: c.ultimos4 ?? null }))} pendientes={pendientes} bancoSugerido={searchParams.banco} />
    </div>
  );
}
