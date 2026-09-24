'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, ExternalLink, Check, LifeBuoy, Trash2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { money, fechaCorta } from '@/lib/format';
import { COMERCIOS } from '@/lib/domain/comercios';
import { normalizar } from '@/lib/domain/categorizar';
import { costoMensual, proximoCobro, totalPagado } from '@/lib/domain/recurrentes';
import { aISO, deISO } from '@/lib/domain/fechas';
import type { Recurrente } from '@/lib/domain/tipos';
import { Panel } from '@/components/ui/Panel';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { crearEvento, eliminarRecurrente, marcarCancelada, solicitarCancelacion } from '@/app/app/fijos/acciones';
import { ModalCancelar } from './ModalCancelar';

const PASOS_GENERICOS = ['Entra a tu cuenta del servicio (app o sitio web).', 'Busca "Suscripción", "Plan" o "Facturación" en Ajustes o Perfil.', 'Elige "Cancelar suscripción" y confirma. Guarda el correo de confirmación.', 'Vuelve aquí y marca "Ya la cancelé": vigilamos que el cargo no regrese.'];

export function DrawerRecurrente({ recurrente: r, ingresoMensual, onClose }: { recurrente: Recurrente | null; ingresoMensual: number; onClose: () => void }) {
  const [modo, setModo] = useState<'detalle' | 'guiada' | 'porMi' | 'listo'>('detalle');
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState(false);
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

  const recordar = () =>
    start(async () => {
      const f = new Date(proximo.getTime());
      f.setDate(f.getDate() - 1);
      const res = await crearEvento({ fecha: aISO(f), nombre: `Recordatorio: ${r.nombre} ${money(r.monto)}`, monto: r.monto, tipo: 'recordatorio', recurrenteId: r.id });
      setMensaje(res.ok ? `Te recordamos el ${fechaCorta(aISO(f))}, un día antes del cobro.` : res.error);
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

  const porMi = () =>
    start(async () => {
      const res = await solicitarCancelacion(r.id);
      setModo(res.ok ? 'listo' : 'detalle');
      if (!res.ok) setMensaje(res.error);
    });

  const borrar = () =>
    start(async () => {
      await eliminarRecurrente(r.id);
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
          <p className="mt-1.5 text-[13px] text-white/70">{r.canceladoAt || pendiente ? `Dejamos de contar ${r.nombre}. Te avisamos si el cargo vuelve a aparecer.` : `Recibimos tu solicitud. Te escribimos en menos de 24 horas para cancelar ${r.nombre} por ti.`}</p>
          <p className="mt-3 font-display text-[16px] font-bold text-green-light">Ahorras {money(mensual * 12)} al año</p>
          <Button variant="white" className="mt-6" onClick={cerrar}>Cerrar</Button>
        </div>
      ) : modo === 'guiada' ? (
        <div className="space-y-4 pb-4">
          <h3 className="font-display text-[18px] font-bold">Cancelar {r.nombre}</h3>
          {conocido?.cancelarUrl && (
            <a href={conocido.cancelarUrl} target="_blank" rel="noreferrer" className="flex h-12 items-center justify-center gap-2 rounded-[14px] bg-green-light text-[14px] font-bold text-ink">
              Ir a la página de cancelación <ExternalLink size={16} />
            </a>
          )}
          <ol className="space-y-2.5">
            {PASOS_GENERICOS.map((p, i) => (
              <li key={i} className="flex gap-3 text-[13px] text-white/85"><span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-white/12 text-[11px] font-bold">{i + 1}</span>{p}</li>
            ))}
          </ol>
          <Button variant="white" size="lg" full disabled={pendiente} onClick={yaCancele}><Check size={18} /> Ya la cancelé</Button>
          <button type="button" onClick={() => setModo('porMi')} className="flex h-11 w-full items-center justify-center gap-2 rounded-[14px] border border-white/20 text-[13px] font-semibold"><LifeBuoy size={16} /> No puedo, cancélenla por mí</button>
          <button type="button" onClick={() => setModo('detalle')} className="w-full text-center text-[12px] text-white/60">Volver</button>
        </div>
      ) : modo === 'porMi' ? (
        <div className="space-y-4 pb-4">
          <h3 className="font-display text-[18px] font-bold">Cancelamos {r.nombre} por ti</h3>
          <p className="text-[13px] text-white/80">Hablamos con el proveedor con una carta de autorización que firmas desde la app. Te confirmamos por correo en menos de 24 horas. Está incluido en tu plan.</p>
          <Button variant="white" size="lg" full disabled={pendiente} onClick={porMi}>{pendiente ? 'Enviando…' : 'Solicitar cancelación'}</Button>
          <button type="button" onClick={() => setModo('guiada')} className="w-full text-center text-[12px] text-white/60">Volver</button>
        </div>
      ) : (
        <div className="space-y-4 pb-4">
          <div className="grid grid-cols-2 gap-2">
            {[
              [esMsi ? 'Cuotas pagadas' : 'Meses pagando', esMsi ? `${r.msiCuotasPagadas ?? r.veces} de ${r.msiCuotasTotal ?? '?'}` : String(meses)],
              ['Precio actual', `${money(r.monto)}${r.frecuencia === 'mensual' ? '/mes' : r.frecuencia === 'anual' ? '/año' : ''}`],
              ['Total pagado', money(totalPagado(r))],
              ['% del ingreso', pctIngreso != null ? `${pctIngreso.toFixed(1)} %` : '—'],
            ].map(([l, v]) => (
              <div key={l} className="rounded-card bg-white/8 px-3.5 py-3">
                <div className="text-[10.5px] font-semibold text-white/60">{l}</div>
                <div className="font-display text-[18px] font-bold">{v}</div>
              </div>
            ))}
          </div>
          <div className="rounded-card bg-white/8 px-3.5 py-3 text-[12.5px]">
            <div className="flex justify-between"><span className="text-white/60">Próximo cobro</span><span className="font-bold">{fechaCorta(proximo)}</span></div>
            {esMsi && r.msiTermina && <div className="mt-1 flex justify-between"><span className="text-white/60">Termina</span><span className="font-bold">{fechaCorta(r.msiTermina)}</span></div>}
            {r.ultimoCargo && <div className="mt-1 flex justify-between"><span className="text-white/60">Último cargo</span><span className="font-bold">{fechaCorta(r.ultimoCargo)}</span></div>}
            <div className="mt-1 flex justify-between"><span className="text-white/60">Al año</span><span className="font-bold">{money(mensual * 12)}</span></div>
          </div>
          {mensaje && <p className="text-[12.5px] font-semibold text-green-light">{mensaje}</p>}
          {esSuscripcion && !r.canceladoAt && (
            <button type="button" onClick={() => setCancelando(true)} className="flex h-[54px] w-full items-center justify-center rounded-[14px] bg-green font-display text-[16px] font-bold text-white shadow-green transition-colors hover:bg-green-dark">
              Cancelar suscripción
            </button>
          )}
          {r.tipo === 'servicio' && !r.canceladoAt && (
            <button type="button" onClick={() => setModo('porMi')} className="flex h-[54px] w-full items-center justify-center rounded-[14px] bg-green font-display text-[16px] font-bold text-white shadow-green transition-colors hover:bg-green-dark">
              Cancelar o negociar por mí
            </button>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={recordar} disabled={pendiente} className={cn('flex h-11 flex-1 items-center justify-center gap-2 rounded-[14px] border border-white/20 text-[13px] font-semibold hover:bg-white/8')}><Bell size={16} /> Recordarme</button>
            <button type="button" onClick={borrar} disabled={pendiente} aria-label="Quitar" className="flex h-11 w-11 items-center justify-center rounded-[14px] border border-white/20 hover:bg-white/8"><Trash2 size={16} /></button>
          </div>
        </div>
      )}
      {cancelando && <ModalCancelar open onClose={() => { setCancelando(false); router.refresh(); }} recurrentes={[r]} inicial={r} />}
    </Panel>
  );
}
