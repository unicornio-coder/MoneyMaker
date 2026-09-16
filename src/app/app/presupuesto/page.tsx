import { Wallet } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

export const metadata = { title: 'Presupuesto · MoneyMaker' };

// Pantalla en construcción (Bloque C). Estado vacío real del tab.
export default function PresupuestoPage() {
  return (
    <EmptyState icon={Wallet} titulo="Tu presupuesto se arma solo" texto="Con dos meses de movimientos te proponemos un presupuesto por quincena. También puedes crearlo desde cero." cta={{ label: 'Empezar', href: '/app/importar' }} />
  );
}
