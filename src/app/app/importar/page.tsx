import { Upload } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

export const metadata = { title: 'Importar estado de cuenta · MoneyMaker' };

// Pantalla en construcción (Bloque C). Estado vacío real del tab.
export default function ImportarPage() {
  return (
    <EmptyState icon={Upload} titulo="Sube tu estado de cuenta" texto="PDF, CSV o Excel de cualquier banco. Lo leemos y llenamos tus movimientos, fijos y presupuesto." cta={{ label: 'Elegir archivo' }} />
  );
}
