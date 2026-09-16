import { Bell } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

export const metadata = { title: 'Insights · MoneyMaker' };

// Pantalla en construcción (Bloque C). Estado vacío real del tab.
export default function InsightsPage() {
  return (
    <EmptyState icon={Bell} titulo="Sin insights por ahora" texto="Cuando tengamos movimientos te avisaremos de suscripciones nuevas, MSI por terminar y cargos duplicados." />
  );
}
