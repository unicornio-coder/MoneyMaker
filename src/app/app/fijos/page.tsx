import { Repeat } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

export const metadata = { title: 'Gastos fijos · MoneyMaker' };

// Pantalla en construcción (Bloque C). Estado vacío real del tab.
export default function FijosPage() {
  return (
    <EmptyState icon={Repeat} titulo="Sin gastos fijos detectados" texto="Detectamos suscripciones, servicios y meses sin intereses a partir de tus movimientos." cta={{ label: 'Subir estado de cuenta', href: '/app/importar' }} />
  );
}
