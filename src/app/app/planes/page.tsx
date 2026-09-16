import { Crown } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

export const metadata = { title: 'Planes · MoneyMaker' };

// Pantalla en construcción (Bloque C). Estado vacío real del tab.
export default function PlanesPage() {
  return (
    <EmptyState icon={Crown} titulo="Plan Premium" texto="$250 MXN al mes. 7 días de prueba. Se conecta al cobro en la Fase 4." />
  );
}
