'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, ArrowRight } from 'lucide-react';

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Captura el correo, lo guarda en la lista de espera (sin bloquear) y manda al registro con el correo puesto. */
export function FormCorreo() {
  const [email, setEmail] = useState('');
  const router = useRouter();
  const valido = CORREO.test(email);
  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valido) return;
    fetch('/api/waitlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, origen: 'landing' }), keepalive: true }).catch(() => {});
    router.push(`/registro?email=${encodeURIComponent(email)}`);
  };
  return (
    <form onSubmit={enviar} className="flex flex-col gap-2 sm:flex-row">
      <label className="relative flex-1">
        <Mail size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-txt-3" />
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="tu@correo.com" className="h-[52px] w-full rounded-[14px] border-2 border-transparent bg-white pl-12 pr-4 text-[15px] text-ink outline-none focus:border-green-light" />
      </label>
      <button type="submit" disabled={!valido} className="flex h-[52px] items-center justify-center gap-2 rounded-[14px] bg-ink px-6 text-[15px] font-bold text-white transition-colors hover:bg-green-dark disabled:opacity-60">
        Empezar registro <ArrowRight size={18} />
      </button>
    </form>
  );
}
