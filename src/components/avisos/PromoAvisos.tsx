'use client';

import { useState } from 'react';
import { BellRing } from 'lucide-react';
import { usePush } from '@/components/ajustes/usePush';
import { Avatar } from '@/components/ui/Avatar';

const EJEMPLOS = [
  ['Netflix', 'netflix.com', 'Mañana se cobran $249', '2 min'],
  ['Telcel', 'telcel.com', 'En 3 días: $400', '1 h'],
  ['Spotify', 'spotify.com', 'Subió de $115 a $129', 'ayer'],
];

/** "Activa los avisos": se muestra arriba de Avisos mientras este dispositivo no los tenga. Se puede posponer. */
export function PromoAvisos() {
  const { estado, activar, ocupado, error } = usePush();
  const [oculto, setOculto] = useState(() => {
    try {
      return sessionStorage.getItem('mm-promo-avisos') === '1';
    } catch {
      return false;
    }
  });
  if (oculto || estado !== 'inactivo') return null;
  const despues = () => {
    setOculto(true);
    try {
      sessionStorage.setItem('mm-promo-avisos', '1');
    } catch {}
  };
  return (
    <section className="card overflow-hidden p-0 text-center">
      <div className="px-5 pt-6">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-dark dark:bg-surface-2 dark:text-green-light"><BellRing size={26} /></span>
        <h2 className="mt-3 font-display text-[22px] font-bold tracking-[-0.5px]">Entérate antes de cada cobro</h2>
        <p className="mx-auto mt-1 max-w-[380px] text-[13px] text-txt-2 dark:text-fg-2">Un aviso en tu teléfono un día y tres días antes de cada cargo fijo, y cuando aparezca una suscripción nueva.</p>
      </div>
      <ul className="mx-auto mt-5 max-w-[360px] space-y-2 px-5">
        {EJEMPLOS.map(([n, d, t, h]) => (
          <li key={n} className="flex items-center gap-3 rounded-card bg-bg-muted px-3 py-2.5 text-left dark:bg-surface-2">
            <Avatar domain={d} nombre={n} size={34} logoPct={60} />
            <span className="min-w-0 flex-1"><span className="block text-[12.5px] font-bold">{n}</span><span className="block truncate text-[11.5px] text-txt-2 dark:text-fg-2">{t}</span></span>
            <span className="text-[10.5px] text-txt-3">{h}</span>
          </li>
        ))}
      </ul>
      <div className="px-5 pb-5 pt-5">
        <button type="button" onClick={() => void activar()} disabled={ocupado} className="btn-primary flex h-12 w-full items-center justify-center text-[15px]">{ocupado ? 'Un momento…' : 'Activar avisos'}</button>
        <button type="button" onClick={despues} className="mt-2 h-10 w-full text-[13px] font-semibold text-txt-2 dark:text-fg-2">Ahora no</button>
        {error && <p className="mt-1 text-[12px] font-semibold text-negative">{error}</p>}
      </div>
    </section>
  );
}
