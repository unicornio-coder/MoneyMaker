'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, ExternalLink, Check, Trash2, FileDown, Phone, Mail, Handshake } from 'lucide-react';
import { cn } from '@/lib/cn';
import { money, fechaCorta } from '@/lib/format';
import { COMERCIOS } from '@/lib/domain/comercios';
import { normalizar } from '@/lib/domain/texto';
import { costoMensual, proximoCobro, totalPagado } from '@/lib/domain/recurrentes';
import { aISO, deISO } from '@/lib/domain/fechas';
import type { Recurrente } from '@/lib/domain/tipos';
import { Panel } from '@/components/ui/Panel';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { crearEvento, eliminarRecurrente, marcarCancelada, marcarNoRecurrente } from '@/app/app/fijos/acciones';
import { categoria } from '@/lib/domain/categorias';
import { ModalCancelar, urlCarta } from './ModalCancelar';
import { ModalNegociar } from './ModalNegociar';

export function DrawerRecurrente({ recurrente: r, ingresoMensual, onClose }: { recurrente: Recurrente | null; ingresoMensual: number; onClose: () => void }) {
  const [modo, setModo] = useState<'detalle' | 'listo'>('detalle');
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState(false);
  const [negociando, setNegociando] = useState(false);
  const [pendiente, start] = useTransition();
  const router = useRouter();
  if (!r) return null;

  const conocido = COMERCIOS.find((c) => normalizar(r.nombre).includes(c.patron));
  const esSuscripcion = r.tipo === 'suscripcion';
  const esMsi = r.tipo === 'msi';
  const mensual = esMsi ? r.monto : costoMensual(r);
  const pctIngreso = ingresoMensual > 0 ? (mensual / ingresoMensual) * 100 : null;
  const proximo = proximoCobro(r);
  const meses = r.primerCargo ? Math.max(1, Math.round((Date.now() - deISO(r.primerCargo).getTime()) / (30.4 * 86_400_000)) + 1) : r.veces;
  const diasParaCobro = Math.max(0, Math.round((proximo.getTime() - Date.now()) / 86_400_000));

  const recordar = () =>
    start(async () => {
      const f = new Date(proximo.getTime());
      f.setDate(f.getDate() - 3);
      const res = await crearEvento({ fecha: aISO(f), nombre: `Recordatorio: ${r.nombre} ${money(r.monto)}`, monto: r.monto, tipo: 'recordatorio', recurrenteId: r.id });
      setMensaje(res.ok ? `Te recordamos el ${fechaCorta(aISO(f))}, tres días antes del cobro.` : res.error);
      router.refresh();
    });

  const yaCancele = () =>
    start(async () => {
      const res = await marcarCancelada(r.id);
      if (res.ok) {
        setModo('listo');
        router.refresh();
      } else setMensaje(res.error);
    });

  const borrar = () =>
    start(async () => {
      // "No es recurrente": si lo detectamos nosotros, lo dejamos de contar y no lo volvemos a crear; si es manual, se borra.
      if (r.origen === 'detectado') await marcarNoRecurrente(r.id);
      else await eliminarRecurrente(r.id);
      onClose();
      router.refresh();
    });

  const cerrar = () => {
    setModo('detalle');
    setMensaje(null);
    onClose();
  };

  return (
    <Panel open onClose={cerrar} mode="drawer" dark title={<span className="flex items-center gap-2.5"><Avatar domain={r.comercioDominio} nombre={r.nombre} size={36} bg="rgba(255,255,255,0.12)" className="text-white" /> {r.nombre}</span>}>
      {modo === 'listo' ? (
        <div className="py-10 text-center">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-light text-ink"><Check size={28} strokeWidth={3} /></span>
          <h3 className="font-display text-[20px] font-bold">Listo</h3>
          <p className="mt-1.5 text-[13px] text-white/70">{r.canceladoAt || pendiente ? `Dejamos de contar ${r.nombre}. Te avisamos si el cargo vuelve a aparecer.` : `Tu carta de cancelación de ${r.nombre} ya salió a tu correo. En 10 días te preguntamos si ya se confirmó.`}</p>
          <p className="mt-3 font-display text-[16px] font-bold text-green-light">Ahorras {money(mensual * 12)} al año</p>
          {!r.canceladoAt && (
            <a href={urlCarta(r.id)} className="mx-auto mt-5 flex h-11 w-fit items-center gap-2 rounded-pill border border-white/25 px-4 text-[13px] font-semibold hover:bg-white/8"><FileDown size={16} /> Descargar carta de cancelación (PDF)</a>
          )}
          <Button variant="white" className="mt-6" onClick={cerrar}>Cerrar</Button>
        </div>
      ) : (
        <div className="space-y-4 pb-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="text-[12px] text-white/60">{esMsi ? 'Cuota al mes' : r.frecuencia === 'anual' ? 'Al año' : 'Al mes'}</div>
              <div className="font-display text-[32px] font-bold leading-none tracking-[-1.2px]">{money(esMsi || r.frecuencia !== 'anual' ? mensual : r.monto)}</div>
            </div>
            <span className="rounded-pill bg-green-light px-2.5 py-1 text-[11px] font-bold text-ink">{diasParaCobro === 0 ? 'Se cobra hoy' : diasParaCobro === 1 ? 'Mañana' : `En ${diasParaCobro} días`}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              ['Próximo cobro', fechaCorta(proximo)],
              esMsi ? ['Cuotas', `${r.msiCuotasPagadas ?? r.veces} de ${r.msiCuotasTotal ?? '?'}`] : ['Ciclo', `${r.frecuencia === 'anual' ? 'Cada año' : r.frecuencia === 'semanal' ? 'Cada semana' : r.frecuencia === 'quincenal' ? 'Cada quincena' : 'Cada mes'}${r.primerCargo ? ` · desde ${fechaCorta(r.primerCargo)}` : ''}`],
              ['Total pagado', `${money(totalPagado(r))} · ${meses} ${meses === 1 ? 'mes' : 'meses'}`],
              esMsi && r.msiTermina ? ['Termina', fechaCorta(r.msiTermina)] : ['Categoría', categoria(r.categoriaId ?? (esSuscripcion ? 'suscripciones' : 'servicios')).nombre],
            ].map(([l, v]) => (
              <div key={l} className="rounded-card bg-white/8 px-3.5 py-3">
                <div className="text-[10.5px] font-semibold text-white/60">{l}</div>
                <div className="mt-0.5 font-display text-[15px] font-bold leading-snug">{v}</div>
              </div>
            ))}
          </div>
          {pctIngreso != null && <p className="text-[12px] text-white/60">{money(mensual * 12)} al año · {pctIngreso.toFixed(1)} % de tu ingreso mensual.</p>}
          <button type="button" onClick={recordar} disabled={pendiente} className="flex h-12 w-full items-center gap-3 rounded-[14px] bg-white/8 px-3.5 text-left text-[13px] font-semibold hover:bg-white/12">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-green-light"><Bell size={16} /></span>
            <span className="flex-1">Avisarme 3 días antes del cobro</span>
            <span className="text-[11.5px] text-white/60">{fechaCorta(aISO(new Date(proximo.getTime() - 3 * 86_400_000)))}</span>
          </button>
          {mensaje && <p className="text-[12.5px] font-semibold text-green-light">{mensaje}</p>}

          {esSuscripcion && !r.canceladoAt && (
            <div className="space-y-2 pt-1">
              <div className="text-[11px] font-bold uppercase tracking-[0.6px] text-white/60">Cancelar {r.nombre}</div>
              {conocido?.cancelarUrl && (
                <a href={conocido.cancelarUrl} target="_blank" rel="noreferrer" className="flex h-[52px] w-full items-center justify-center gap-2 rounded-[14px] bg-green-light font-display text-[15px] font-bold text-ink hover:bg-white">
                  {conocido.requiereLlamada ? <Phone size={17} /> : <ExternalLink size={17} />} {conocido.requiereLlamada ? `Llamar a ${r.nombre}` : `Cancelar en ${r.nombre}`}
                </a>
              )}
              <button type="button" onClick={() => setCancelando(true)} className={cn('flex h-[52px] w-full items-center justify-center gap-2 rounded-[14px] font-display text-[15px] font-bold', conocido?.cancelarUrl ? 'border border-white/25 text-white hover:bg-white/8' : 'bg-green-light text-ink hover:bg-white')}>
                <Mail size={17} /> Mandar carta por correo
              </button>
              <button type="button" onClick={yaCancele} disabled={pendiente} className="flex h-11 w-full items-center justify-center gap-2 rounded-[14px] border border-white/25 text-[13px] font-semibold hover:bg-white/8"><Check size={16} /> Ya la cancelé</button>
              {conocido?.truco && <p className="text-[11.5px] leading-relaxed text-white/60">{conocido.truco}</p>}
            </div>
          )}
          {r.tipo === 'servicio' && !r.canceladoAt && (
            <button type="button" onClick={() => setNegociando(true)} className="flex h-[52px] w-full items-center justify-center gap-2 rounded-[14px] bg-green-light font-display text-[15px] font-bold text-ink hover:bg-white">
              <Handshake size={17} /> Negociar mi tarifa
            </button>
          )}
          <button type="button" onClick={borrar} disabled={pendiente} className="flex h-10 w-full items-center justify-center gap-1.5 text-[12.5px] font-semibold text-white/60 hover:text-white"><Trash2 size={14} /> {r.origen === 'detectado' ? 'No es recurrente' : 'Quitar'}</button>
        </div>
      )}
      {cancelando && <ModalCancelar open onClose={() => { setCancelando(false); router.refresh(); }} recurrentes={[r]} inicial={r} pasoInicial="formulario" />}
      {negociando && <ModalNegociar recurrente={r} onClose={() => { setNegociando(false); router.refresh(); }} />}
    </Panel>
  );
}
