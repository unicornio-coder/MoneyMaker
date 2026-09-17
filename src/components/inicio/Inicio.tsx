'use client';

import { useState } from 'react';
import { Home } from 'lucide-react';
import type { DatosInicio } from './tipos';
import { GastoActual } from './GastoActual';
import { Cuentas } from './Cuentas';
import { DrawerCuenta } from './DrawerCuenta';
import { Historial } from '@/components/movimientos/Historial';
import { ObjetivosBloque } from './ObjetivosBloque';
import { SubeExcel } from './SubeExcel';
import { ModalBancos } from '@/components/cuentas/ModalBancos';
import { EmptyState } from '@/components/ui/EmptyState';

export function Inicio({ datos }: { datos: DatosInicio }) {
  const [cuentaSel, setCuentaSel] = useState<string | null>(null);
  const [bancosAbierto, setBancosAbierto] = useState(false);
  const cuenta = datos.cuentas.find((c) => c.id === cuentaSel) ?? null;
  const hayCuentas = datos.cuentas.length > 0;

  return (
    <div className="grid gap-5 md:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-5">
        {hayCuentas ? (
          <GastoActual movimientos={datos.movimientos} diasPago={datos.diasPago} hoy={datos.hoy} />
        ) : (
          <EmptyState icon={Home} titulo="Aún no hay cuentas" texto="Agrega tu primera cuenta o sube un estado de cuenta para ver tu quincena." cta={{ label: 'Agregar cuenta', onClick: () => setBancosAbierto(true) }} />
        )}
        <Cuentas cuentas={datos.cuentas} onAbrir={setCuentaSel} onAgregar={() => setBancosAbierto(true)} />
        <div className="md:hidden">
          <SubeExcel />
        </div>
        {hayCuentas && <Historial movimientos={datos.movimientos} cuentas={datos.cuentas} hoy={datos.hoy} />}
      </div>
      <aside className="hidden min-w-0 space-y-5 md:block">
        <SubeExcel />
        <ObjetivosBloque objetivos={datos.objetivos} />
      </aside>

      <DrawerCuenta cuenta={cuenta} movimientos={datos.movimientos} cuentas={datos.cuentas} onClose={() => setCuentaSel(null)} />
      <ModalBancos open={bancosAbierto} onClose={() => setBancosAbierto(false)} instituciones={datos.instituciones} agregador={datos.agregador} />
    </div>
  );
}
