import { contexto } from '@/lib/data/contexto';
import { Objetivos } from '@/components/objetivos/Objetivos';

export const metadata = { title: 'Objetivos · MoneyMaker' };
export const dynamic = 'force-dynamic';

export default async function ObjetivosPage() {
  const { usuario, repo } = await contexto();
  const [objetivos, cuentas] = await Promise.all([repo.objetivos(usuario.id), repo.cuentas(usuario.id)]);
  return <Objetivos objetivos={objetivos} cuentas={cuentas.map((c) => ({ id: c.id, nombre: c.nombre }))} />;
}
