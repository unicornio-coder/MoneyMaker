import { PieChart } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

export const metadata = { title: 'Gastos · MoneyMaker' };

// Pantalla en construcción (Bloque B). Estado vacío real del tab.
export default function GastosPage() {
  return (
    <EmptyState icon={PieChart} titulo="Sin movimientos todavía" texto="Cuando conectes una cuenta o subas un estado de cuenta, aquí verás tu gasto por periodo y categoría." cta={{ label: 'Subir estado de cuenta', href: '/app/importar' }} />
  );
}
