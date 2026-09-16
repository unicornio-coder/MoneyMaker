import { TrendingUp } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

export const metadata = { title: 'Inversiones · MoneyMaker' };

// Pantalla en construcción (Bloque C). Estado vacío real del tab.
export default function InversionesPage() {
  return (
    <EmptyState icon={TrendingUp} titulo="Conecta una cuenta de inversión" texto="GBM+, Bitso, CetesDirecto o Kuspit. También puedes capturar tus posiciones a mano." cta={{ label: 'Conectar' }} />
  );
}
