'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Home, AlertTriangle, ChevronRight, Sparkles } from 'lucide-react';
import type { DatosInicio } from './tipos';
import { ResumenInicio } from './ResumenInicio';
import { Cuentas } from './Cuentas';
import { SuscripcionesProximas } from './SuscripcionesProximas';
import { DrawerCuenta } from './DrawerCuenta';
import { Historial } from '@/components/movimientos/Historial';
import { HojaAgregarCuenta } from '@/components/cuentas/HojaAgregarCuenta';
import { EmptyState } from '@/components/ui/EmptyState';
import { TEXTOS } from '@/lib/textos';
import { BANCOS } from '@/lib/flags';

type Bloque = 'cuentas' | 'suscripciones' | 'movimientos';
const BLOQUE_POR_META: Record<string, Bloque> = { suscripciones: 'suscripciones', deudas: 'cuentas', casa: 'cuentas', invertir: 'cuentas', ahorrar: 'movimientos', familia: 'movimientos' };

/** Orden de los bloques de Inicio: primero los que corresponden a las metas del usuario, en el orden en que las eligió. */
export function ordenBloques(metas: string[]): Bloque[] {
  const orden: Bloque[] = [];
  for (const b of [...metas.map((m) => BLOQUE_POR_META[m]), 'cuentas', 'suscripciones', 'movimientos'] as (Bloque | undefined)[]) {
    if (b && !orden.includes(b)) orden.push(b);
  }
  return orden;
}

/** Inicio: saldo neto, tarjetas de cuentas (plásticos), suscripciones próximas y movimientos recientes. */
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
      {/* Billy siempre arriba, con o sin cuentas: es la puerta a "¿cuánto me queda?". */}
      <Link href="/app/billy" className="card flex items-center gap-3 p-4 text-[13px] transition-shadow hover:shadow-hover" data-testid="tarjeta-billy">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-green-light dark:bg-surface-2"><Sparkles size={18} /></span>
        <span className="min-w-0 flex-1">
          <b className="block font-display text-[14px]">{hayCuentas ? 'Pregúntale a Billy' : 'Conoce a Billy'}</b>
          <span className="text-txt-2 dark:text-fg-2">{hayCuentas ? <>&ldquo;¿Cuánto me queda?&rdquo; Te contesta aquí mismo, con tus cifras.</> : 'Te dice cuánto te queda, qué pagas de suscripciones y qué cobros vienen. Empieza con tu estado de cuenta.'}</span>
        </span>
        <ChevronRight size={18} className="shrink-0 text-txt-3" />
      </Link>
      {hayCuentas ? <ResumenInicio cuentas={datos.cuentas} quincena={datos.quincena ?? null} /> : <EmptyState icon={Home} titulo={vacio.titulo} texto={vacio.texto} cta={BANCOS ? { label: vacio.cta, onClick: () => setAgregarAbierto(true) } : { label: vacio.cta, href: '/app/importar' }} />}
      {ordenBloques(datos.metas ?? []).map((b) =>
        b === 'cuentas' ? (
          <Cuentas key={b} cuentas={datos.cuentas} onAbrir={setCuentaSel} onAgregar={() => setAgregarAbierto(true)} />
        ) : !hayCuentas ? null : b === 'suscripciones' ? (
          <SuscripcionesProximas key={b} recurrentes={datos.recurrentes} hoy={datos.hoy} />
        ) : (
          <Historial key={b} movimientos={datos.movimientos} cuentas={datos.cuentas} hoy={datos.hoy} titulo="Movimientos recientes" simple inicial={5} verTodosHref="/app/gastos" />
        ),
      )}

      <DrawerCuenta cuenta={cuenta} movimientos={datos.movimientos} cuentas={datos.cuentas} onClose={() => setCuentaSel(null)} />
      <HojaAgregarCuenta open={agregarAbierto} onClose={() => setAgregarAbierto(false)} instituciones={datos.instituciones} agregador={datos.agregador} sandbox={datos.sandbox} />
    </div>
  );
}
