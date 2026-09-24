'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Home, AlertTriangle } from 'lucide-react';
import type { DatosInicio } from './tipos';
import { GastoActual } from './GastoActual';
import { ResumenInicio } from './ResumenInicio';
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
  const rotas = datos.fuentes.filter((f) => f.estado === 'roto' || f.estado === 'mfa');

  return (
    <div className="grid gap-5 md:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-5">
        {rotas.length > 0 && (
          <Link href="/app/ajustes?sec=fuentes" className="flex items-center gap-3 rounded-card border border-warning/40 bg-warning-soft px-4 py-3 text-[13px] dark:bg-surface-2">
            <AlertTriangle size={18} className="flex-none text-warning" />
            <span className="min-w-0 flex-1"><b>{rotas.map((f) => f.institucion).join(', ')}</b> {rotas.length === 1 ? 'necesita que vuelvas a conectar' : 'necesitan que vuelvas a conectar'} para seguir trayendo movimientos.</span>
            <span className="font-semibold text-green-dark dark:text-green-light">Reconectar</span>
          </Link>
        )}
        {hayCuentas ? (
          <>
            <ResumenInicio cuentas={datos.cuentas} recurrentes={datos.recurrentes} hoy={datos.hoy} />
            <GastoActual movimientos={datos.movimientos} diasPago={datos.diasPago} hoy={datos.hoy} />
          </>
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
      <HojaAgregarCuenta open={agregarAbierto} onClose={() => setAgregarAbierto(false)} instituciones={datos.instituciones} agregador={datos.agregador} sandbox={datos.sandbox} />
    </div>
  );
}
