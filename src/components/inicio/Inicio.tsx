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
import { HojaAgregarCuenta } from '@/components/cuentas/HojaAgregarCuenta';
import { EmptyState } from '@/components/ui/EmptyState';
import { TEXTOS } from '@/lib/textos';

export function Inicio({ datos, cuentaInicial }: { datos: DatosInicio; cuentaInicial?: string | null }) {
  const [cuentaSel, setCuentaSel] = useState<string | null>(cuentaInicial && datos.cuentas.some((c) => c.id === cuentaInicial) ? cuentaInicial : null);
  const [agregarAbierto, setAgregarAbierto] = useState(false);
  const cuenta = datos.cuentas.find((c) => c.id === cuentaSel) ?? null;
  const hayCuentas = datos.cuentas.length > 0;
  const vacio = TEXTOS.vacios.inicio;

  return (
    <div className="grid gap-5 md:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-5">
        {hayCuentas ? (
          <GastoActual movimientos={datos.movimientos} diasPago={datos.diasPago} hoy={datos.hoy} />
        ) : (
          <EmptyState icon={Home} titulo={vacio.titulo} texto={vacio.texto} cta={{ label: vacio.cta, href: '/app/importar' }} />
        )}
        <Cuentas cuentas={datos.cuentas} onAbrir={setCuentaSel} onAgregar={() => setAgregarAbierto(true)} />
        {hayCuentas && <Historial movimientos={datos.movimientos} cuentas={datos.cuentas} hoy={datos.hoy} />}
      </div>
      <aside className="hidden min-w-0 space-y-5 md:block">
        <SubeExcel />
        <ObjetivosBloque objetivos={datos.objetivos} />
      </aside>

      <DrawerCuenta cuenta={cuenta} movimientos={datos.movimientos} cuentas={datos.cuentas} onClose={() => setCuentaSel(null)} />
      <HojaAgregarCuenta open={agregarAbierto} onClose={() => setAgregarAbierto(false)} />
    </div>
  );
}
