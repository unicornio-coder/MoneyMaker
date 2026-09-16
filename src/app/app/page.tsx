import { Home } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

export const metadata = { title: 'Inicio · MoneyMaker' };

// Pantalla en construcción (Bloque B). Estado vacío real del tab.
export default function InicioPage() {
  return (
    <EmptyState icon={Home} titulo="Aún no hay cuentas" texto="Agrega tu primera cuenta o sube un estado de cuenta para ver tu quincena." cta={{ label: 'Agregar cuenta', href: '/app/importar' }} />
  );
}
