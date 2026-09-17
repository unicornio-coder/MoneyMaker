import { contexto } from '@/lib/data/contexto';
import { Importar } from '@/components/importar/Importar';

export const metadata = { title: 'Importar estado de cuenta · MoneyMaker' };
export const dynamic = 'force-dynamic';

export default async function ImportarPage({ searchParams }: { searchParams: { banco?: string } }) {
  const { usuario, repo } = await contexto();
  const cuentas = await repo.cuentas(usuario.id);
  return <Importar cuentas={cuentas.map((c) => ({ id: c.id, nombre: c.nombre, banco: c.banco, tipo: c.tipo }))} bancoSugerido={searchParams.banco} />;
}
