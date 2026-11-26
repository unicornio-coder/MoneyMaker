'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, PieChart, Repeat, Wallet } from 'lucide-react';
import { dejarArchivosPendientes } from '@/lib/archivosPendientes';
import { EjemplosRapidos } from '@/components/importar/EjemplosRapidos';

const LO_QUE_VERAS = [
  { icon: Repeat, titulo: 'Suscripciones', texto: 'Cuáles pagas, desde cuándo y cómo cancelarlas.' },
  { icon: Wallet, titulo: 'Presupuesto por quincena', texto: 'Cuánto te queda hasta tu próximo pago.' },
  { icon: PieChart, titulo: 'Gasto por categoría', texto: 'A dónde se va cada peso, sin capturar nada a mano.' },
];

/**
 * Inicio de una cuenta sin datos: una sola acción (subir el estado de cuenta), el atajo de los ejemplos y qué se
 * obtiene. Reemplaza la tarjeta chica, la sección "Cuentas" vacía y los tres botones que hacían lo mismo.
 */
export function EmpezarInicio() {
  const router = useRouter();
  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-card-xl bg-ink p-6 text-white shadow-dark dark:bg-surface-2 dark:ring-1 dark:ring-white/10 md:p-8" aria-labelledby="titulo-empezar">
        <span className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-green/30 blur-3xl" aria-hidden />
        <div className="relative">
          <span className="text-[11px] font-bold uppercase tracking-[0.9px] text-green-light">Primer paso</span>
          <h2 id="titulo-empezar" className="mt-2 max-w-[520px] font-display text-[26px] font-bold leading-[1.1] tracking-[-0.8px] md:text-[32px]">Tu panel se arma con tu estado de cuenta</h2>
          <p className="mt-2.5 max-w-[520px] text-[14px] leading-relaxed text-white/70">Sube el PDF, Excel o CSV que tu banco ya te manda. En dos minutos ves tus suscripciones, tu gasto por categoría y cuánto te queda de la quincena.</p>
          <Link href="/app/importar" className="mt-5 inline-flex h-12 items-center gap-2 rounded-pill bg-white px-6 text-[14px] font-bold text-ink transition-transform hover:bg-green-50 active:scale-[.98]">
            Subir estado de cuenta <ArrowRight size={17} />
          </Link>
          <div className="mt-7 border-t border-white/10 pt-5">
            <p className="text-[12.5px] font-semibold text-white/80">¿Sin uno a la mano? Pruébala con un ejemplo</p>
            <EjemplosRapidos
              className="mt-3"
              tono="oscuro"
              onArchivo={(archivo) => {
                dejarArchivosPendientes([archivo]);
                router.push('/app/importar');
              }}
            />
          </div>
        </div>
      </section>
      <ul className="grid gap-3 sm:grid-cols-3" aria-label="Lo que vas a ver">
        {LO_QUE_VERAS.map(({ icon: Icon, titulo, texto }) => (
          <li key={titulo} className="card p-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-green-50 text-green-dark dark:bg-surface-2 dark:text-green-light"><Icon size={17} /></span>
            <b className="mt-3 block text-[13.5px]">{titulo}</b>
            <span className="mt-0.5 block text-[12.5px] leading-snug text-txt-2 dark:text-fg-2">{texto}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
