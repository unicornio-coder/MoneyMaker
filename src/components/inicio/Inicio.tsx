'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Home, AlertTriangle } from 'lucide-react';
import type { DatosInicio } from './tipos';
import { ResumenInicio } from './ResumenInicio';
import { CuentasLista } from './CuentasLista';
import { SuscripcionesProximas } from './SuscripcionesProximas';
import { DrawerCuenta } from './DrawerCuenta';
import { Historial } from '@/components/movimientos/Historial';
import { HojaAgregarCuenta } from '@/components/cuentas/HojaAgregarCuenta';
import { EmptyState } from '@/components/ui/EmptyState';
import { TEXTOS } from '@/lib/textos';

/** Inicio: saldo neto, cuentas vinculadas, suscripciones próximas y movimientos recientes. Nada más. */
export function Inicio({ datos, cuentaInicial }: { datos: DatosInicio; cuentaInicial?: string | null }) {
  const [cuentaSel, setCuentaSel] = useState<string | null>(cuentaInicial && datos.cuentas.some((c) => c.id === cuentaInicial) ? cuentaInicial : null);
  const [agregarAbierto, setAgregarAbierto] = useState(false);
  const cuenta = datos.cuentas.find((c) => c.id === cuentaSel) ?? null;
  const hayCuentas = datos.cuentas.length > 0;
  const vacio = TEXTOS.vacios.inicio;
  const rotas = datos.fuentes.filter((f) => f.estado === 'roto' || f.estado === 'mfa');

  return (
    <div className="mx-auto max-w-[760px] space-y-6">
      {rotas.length > 0 && (
        <Link href="/app/ajustes?sec=fuentes" className="flex items-center gap-3 rounded-card border border-warning/40 bg-warning-soft px-4 py-3 text-[13px] dark:bg-surface-2">
          <AlertTriangle size={18} className="flex-none text-warning" />
          <span className="min-w-0 flex-1"><b>{rotas.map((f) => f.institucion).join(', ')}</b> {rotas.length === 1 ? 'necesita que vuelvas a conectar' : 'necesitan que vuelvas a conectar'} para seguir trayendo movimientos.</span>
          <span className="font-semibold text-green-dark dark:text-green-light">Reconectar</span>
        </Link>
      )}
      {hayCuentas ? <ResumenInicio cuentas={datos.cuentas} /> : <EmptyState icon={Home} titulo={vacio.titulo} texto={vacio.texto} cta={{ label: vacio.cta, href: '/app/importar' }} />}
      <CuentasLista cuentas={datos.cuentas} fuentes={datos.fuentes} onAbrir={setCuentaSel} onAgregar={() => setAgregarAbierto(true)} />
      {hayCuentas && <SuscripcionesProximas recurrentes={datos.recurrentes} hoy={datos.hoy} />}
      {hayCuentas && <Historial movimientos={datos.movimientos} cuentas={datos.cuentas} hoy={datos.hoy} titulo="Movimientos recientes" simple inicial={5} verTodosHref="/app/gastos" />}

      <DrawerCuenta cuenta={cuenta} movimientos={datos.movimientos} cuentas={datos.cuentas} onClose={() => setCuentaSel(null)} />
      <HojaAgregarCuenta open={agregarAbierto} onClose={() => setAgregarAbierto(false)} instituciones={datos.instituciones} agregador={datos.agregador} sandbox={datos.sandbox} />
    </div>
  );
}
