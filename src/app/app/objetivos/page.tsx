import { Flag } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

export const metadata = { title: 'Objetivos · MoneyMaker' };

// Pantalla en construcción (Bloque C). Estado vacío real del tab.
export default function ObjetivosPage() {
  return (
    <EmptyState icon={Flag} titulo="Sin objetivos todavía" texto="Crea un objetivo de ahorro, deuda o inversión y sigue tu avance cada quincena." cta={{ label: 'Nuevo objetivo' }} />
  );
}
