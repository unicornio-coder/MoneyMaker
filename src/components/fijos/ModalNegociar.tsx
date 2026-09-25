'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ShieldCheck } from 'lucide-react';
import { money, fechaCorta } from '@/lib/format';
import type { Recurrente } from '@/lib/domain/tipos';
import { Panel } from '@/components/ui/Panel';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { registrarNegociacion, solicitarNegociacion } from '@/app/app/fijos/acciones';

type Paso = 'datos' | 'enviado' | 'resultado';

/** "Negociar mi tarifa" sin humanos: carta + guion por correo, y al final el usuario anota el nuevo precio (comisión 25 % del ahorro). */
export function ModalNegociar({ recurrente: r, onClose }: { recurrente: Recurrente; onClose: () => void }) {
  const router = useRouter();
  const [paso, setPaso] = useState<Paso>('datos');
  const [form, setForm] = useState({ precioActual: String(Math.round(r.monto)), ofertaProveedor: '', ofertaPrecio: '', correoProveedor: '', numeroCuenta: '' });
  const [envio, setEnvio] = useState<{ id: string; enviadoA: string | null; seguimiento: string; guion: string[] } | null>(null);
  const [nuevoPrecio, setNuevoPrecio] = useState('');
  const [resultado, setResultado] = useState<{ ahorroAnual: number; comision: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, start] = useTransition();

  const enviar = () =>
    start(async () => {
      setError(null);
      const res = await solicitarNegociacion(r.id, { precioActual: Number(form.precioActual), ofertaProveedor: form.ofertaProveedor || null, ofertaPrecio: form.ofertaPrecio ? Number(form.ofertaPrecio) : null, correoProveedor: form.correoProveedor || null, numeroCuenta: form.numeroCuenta || null });
      if (!res.ok) return setError(res.error);
      setEnvio({ id: res.id, enviadoA: res.enviadoA, seguimiento: res.seguimiento, guion: res.guion ?? [] });
      setPaso('enviado');
      router.refresh();
    });

  const anotar = () =>
    start(async () => {
      if (!envio) return;
      const res = await registrarNegociacion(envio.id, r.id, Number(form.precioActual), Number(nuevoPrecio));
      if (!res.ok) return setError(res.error);
      setResultado({ ahorroAnual: res.ahorroAnual, comision: res.comision });
      setPaso('resultado');
      router.refresh();
    });

  const campo = (label: string, key: keyof typeof form, placeholder: string, extra: Partial<React.InputHTMLAttributes<HTMLInputElement>> = {}) => (
    <label className="block">
      <span className="mb-1 block text-[12px] font-semibold text-txt-2 dark:text-fg-2">{label}</span>
      <input value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} placeholder={placeholder} className="input text-[13.5px]" {...extra} />
    </label>
  );

  return (
    <Panel open onClose={onClose} mode="modal" title={<span className="flex items-center gap-2"><Avatar domain={r.comercioDominio} nombre={r.nombre} size={30} logoPct={60} /> Negociar {r.nombre}</span>}>
      {paso === 'datos' && (
        <div className="space-y-3 pb-2">
          <p className="text-[12.5px] text-txt-2 dark:text-fg-2">Mandamos una carta pidiendo mejor tarifa y te damos el guion para la llamada. Si consigues un precio menor, MoneyMaker cobra el 25 % del ahorro del primer año; si no, nada.</p>
          {campo('Lo que pagas hoy al mes', 'precioActual', '899', { inputMode: 'decimal' })}
          <div className="grid grid-cols-2 gap-2">
            {campo('Competencia (opcional)', 'ofertaProveedor', 'Izzi')}
            {campo('Su precio al mes', 'ofertaPrecio', '599', { inputMode: 'decimal' })}
          </div>
          {campo('Correo de atención del servicio (si lo tienes)', 'correoProveedor', 'atencion@servicio.com', { type: 'email' })}
          {campo('Número de cuenta o línea (opcional)', 'numeroCuenta', '')}
          {error && <p className="text-[12.5px] font-semibold text-negative">{error}</p>}
          <Button variant="green" size="lg" full disabled={pendiente} onClick={enviar}>{pendiente ? 'Enviando…' : 'Enviar carta y darme el guion'}</Button>
          <p className="flex items-center justify-center gap-1.5 text-[11px] text-txt-3"><ShieldCheck size={13} /> Sin claves ni contraseñas. Con copia a tu correo.</p>
        </div>
      )}
      {paso === 'enviado' && envio && (
        <div className="space-y-4 pb-2">
          <div className="flex items-center gap-3 rounded-card bg-green-50 p-3.5 text-[13px] dark:bg-surface-2"><Check size={18} className="flex-none text-green-dark dark:text-green-light" />{envio.enviadoA ? `Carta enviada a ${envio.enviadoA}. El ${fechaCorta(envio.seguimiento)} te preguntamos qué pasó.` : `Tu carta está lista para descargar. El ${fechaCorta(envio.seguimiento)} te preguntamos qué pasó.`}</div>
          <div>
            <div className="mb-1.5 text-[12.5px] font-bold">Guion para la llamada o el chat</div>
            <ol className="space-y-2 rounded-card border border-edge p-4">
              {envio.guion.map((g, i) => <li key={i} className="flex gap-2.5 text-[12.5px] text-txt-2 dark:text-fg-2"><span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-green-50 text-[10.5px] font-bold text-green-dark dark:bg-surface-2 dark:text-green-light">{i + 1}</span>{g}</li>)}
            </ol>
          </div>
          <div>
            <div className="mb-1.5 text-[12.5px] font-bold">¿Ya te dieron nuevo precio? Anótalo</div>
            <div className="flex gap-2">
              <input value={nuevoPrecio} onChange={(e) => setNuevoPrecio(e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal" placeholder="Nuevo precio al mes" aria-label="Nuevo precio al mes" className="input flex-1 text-[13.5px]" />
              <Button variant="green" disabled={pendiente || !nuevoPrecio} onClick={anotar}>Guardar</Button>
            </div>
            {error && <p className="mt-2 text-[12.5px] font-semibold text-negative">{error}</p>}
          </div>
          <Button variant="outline" full onClick={onClose}>Cerrar por ahora</Button>
        </div>
      )}
      {paso === 'resultado' && resultado && (
        <div className="py-8 text-center">
          <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green text-white animate-pop"><Check size={32} strokeWidth={3} /></span>
          {resultado.ahorroAnual > 0 ? (
            <>
              <h3 className="font-display text-[22px] font-bold tracking-[-0.5px]">Ahorras {money(resultado.ahorroAnual)} al año</h3>
              <p className="mx-auto mt-1.5 max-w-[340px] text-[13px] text-txt-2 dark:text-fg-2">Actualizamos {r.nombre} a {money(Number(nuevoPrecio))} al mes. La comisión de MoneyMaker es {money(resultado.comision)} (25 % del ahorro del primer año); te la cobramos en tu siguiente factura.</p>
            </>
          ) : (
            <>
              <h3 className="font-display text-[22px] font-bold tracking-[-0.5px]">No bajaron el precio</h3>
              <p className="mx-auto mt-1.5 max-w-[340px] text-[13px] text-txt-2 dark:text-fg-2">Sin ahorro no hay comisión. Si quieres, cancela {r.nombre} con la carta de cancelación y cámbiate.</p>
            </>
          )}
          <Button className="mt-6" onClick={onClose}>Cerrar</Button>
        </div>
      )}
    </Panel>
  );
}
