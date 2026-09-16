import { Settings } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

export const metadata = { title: 'Ajustes · MoneyMaker' };

// Pantalla en construcción (Bloque C). Estado vacío real del tab.
export default function AjustesPage() {
  return (
    <EmptyState icon={Settings} titulo="Ajustes" texto="Perfil, cuenta y seguridad, notificaciones, plan, familia, exportar datos y cerrar sesión." />
  );
}
