import { BarChart3 } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

export const metadata = { title: 'Patrimonio · MoneyMaker' };

// Pantalla en construcción (Bloque C). Estado vacío real del tab.
export default function PatrimonioPage() {
  return (
    <EmptyState icon={BarChart3} titulo="Aún no hay activos ni pasivos" texto="Agrega tu casa, autos, inversiones y deudas para ver tu patrimonio neto." cta={{ label: 'Agregar' }} />
  );
}
