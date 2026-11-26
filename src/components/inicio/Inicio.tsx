'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Home, AlertTriangle, ChevronRight, Sparkles, FileUp } from 'lucide-react';
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

  const billyTexto = hayCuentas ? <>&ldquo;¿Cuánto me queda?&rdquo; Te contesta aquí mismo, con tus cifras.</> : 'Te dice cuánto te queda, qué pagas de suscripciones y qué cobros vienen. Empieza con tu estado de cuenta.';

  return (
    <div className="mx-auto max-w-[1180px] lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-7">
      {/* flex + gap y no space-y: la tarjeta de Billy del teléfono está oculta en computadora y no debe dejar hueco. */}
      <div className="flex min-w-0 flex-col gap-6">
      {rotas.length > 0 && (
        <Link href="/app/ajustes?sec=fuentes" className="flex items-center gap-3 rounded-card border border-warning/40 bg-warning-soft px-4 py-3 text-[13px] dark:bg-surface-2">
          <AlertTriangle size={18} className="flex-none text-warning" />
          <span className="min-w-0 flex-1"><b>{rotas.map((f) => f.institucion).join(', ')}</b> {rotas.length === 1 ? 'necesita que vuelvas a conectar' : 'necesitan que vuelvas a conectar'} para seguir trayendo movimientos.</span>
          <span className="font-semibold text-green-dark dark:text-green-light">Reconectar</span>
        </Link>
      )}
      {/* Billy siempre arriba en el teléfono, con o sin cuentas: es la puerta a "¿cuánto me queda?". En computadora vive en la columna derecha. */}
      <Link href="/app/billy" className="card flex items-center gap-3 p-4 text-[13px] transition-shadow hover:shadow-hover lg:hidden" data-testid="tarjeta-billy">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-green-light dark:bg-surface-2"><Sparkles size={18} /></span>
        <span className="min-w-0 flex-1">
          <b className="block font-display text-[14px]">{hayCuentas ? 'Pregúntale a Billy' : 'Conoce a Billy'}</b>
          <span className="text-txt-2 dark:text-fg-2">{billyTexto}</span>
        </span>
        <ChevronRight size={18} className="shrink-0 text-txt-3" />
      </Link>
      {hayCuentas ? <ResumenInicio cuentas={datos.cuentas} quincena={datos.quincena ?? null} /> : <EmptyState icon={Home} titulo={vacio.titulo} texto={vacio.texto} cta={BANCOS ? { label: vacio.cta, onClick: () => setAgregarAbierto(true) } : { label: vacio.cta, href: '/app/importar' }} />}
      {ordenBloques(datos.metas ?? []).map((b) =>
        b === 'cuentas' ? (
          <Cuentas key={b} cuentas={datos.cuentas} onAbrir={setCuentaSel} onAgregar={() => setAgregarAbierto(true)} />
        ) : !hayCuentas ? null : b === 'suscripciones' ? (
          <div key={b} className="lg:hidden"><SuscripcionesProximas recurrentes={datos.recurrentes} hoy={datos.hoy} /></div>
        ) : (
          <Historial key={b} movimientos={datos.movimientos} cuentas={datos.cuentas} hoy={datos.hoy} titulo="Movimientos recientes" simple inicial={hayCuentas ? 6 : 5} verTodosHref="/app/gastos" />
        ),
      )}
      </div>

      {/* Columna derecha en computadora: Billy con preguntas listas, lo que viene y subir otro estado. */}
      <aside className="hidden min-w-0 space-y-6 lg:sticky lg:top-[22px] lg:block" aria-label="Atajos">
        <section className="relative overflow-hidden rounded-card-xl bg-ink p-5 text-white shadow-dark dark:bg-surface-2 dark:ring-1 dark:ring-white/10" data-testid="tarjeta-billy">
          <span className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-green/25 blur-2xl" aria-hidden />
          <div className="relative flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-green-light"><Sparkles size={20} /></span>
            <div className="min-w-0">
              <Link href="/app/billy" className="block font-display text-[17px] font-bold tracking-[-0.3px] after:absolute after:inset-0 after:content-['']">{hayCuentas ? 'Pregúntale a Billy' : 'Conoce a Billy'}</Link>
              <p className="text-[12.5px] leading-snug text-white/65">{billyTexto}</p>
            </div>
          </div>
          {hayCuentas && (
            <div className="relative z-10 mt-4 flex flex-col gap-2">
              {[['¿Cuánto me queda?', '/app/billy'], ['¿Cuánto pago de suscripciones?', '/app/billy?p=suscripciones'], ['¿Qué cobros vienen esta semana?', '/app/billy?p=cobros']].map(([t, href]) => (
                <Link key={href} href={href} className="flex items-center justify-between rounded-pill bg-white/10 px-4 py-2.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-white/15">
                  {t}<ChevronRight size={15} className="text-white/50" />
                </Link>
              ))}
            </div>
          )}
        </section>
        {hayCuentas && <SuscripcionesProximas recurrentes={datos.recurrentes} hoy={datos.hoy} />}
        {hayCuentas && (
          <Link href="/app/importar" className="card flex items-center gap-3 p-4 transition-shadow hover:shadow-hover">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-50 text-green-dark dark:bg-surface-2 dark:text-green-light"><FileUp size={18} /></span>
            <span className="min-w-0 flex-1">
              <b className="block text-[13.5px]">Sube otro estado de cuenta</b>
              <span className="text-[12px] text-txt-2 dark:text-fg-2">Más meses, mejores cifras.</span>
            </span>
            <ChevronRight size={18} className="shrink-0 text-txt-3" />
          </Link>
        )}
      </aside>

      <DrawerCuenta cuenta={cuenta} movimientos={datos.movimientos} cuentas={datos.cuentas} onClose={() => setCuentaSel(null)} />
      <HojaAgregarCuenta open={agregarAbierto} onClose={() => setAgregarAbierto(false)} instituciones={datos.instituciones} agregador={datos.agregador} sandbox={datos.sandbox} />
    </div>
  );
}
