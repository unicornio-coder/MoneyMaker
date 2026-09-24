'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ExternalLink, ListChecks, ChevronRight, Check, ShieldCheck, ChevronLeft, AlertTriangle, Phone } from 'lucide-react';
import { cn } from '@/lib/cn';
import { money } from '@/lib/format';
import { COMERCIOS, type ComercioConocido } from '@/lib/domain/comercios';
import { COMERCIOS_DESDE_CATALOGO } from '@/lib/domain/catalogo';
import { normalizar } from '@/lib/domain/categorizar';
import { costoMensual } from '@/lib/domain/recurrentes';
import type { Recurrente } from '@/lib/domain/tipos';
import { Panel } from '@/components/ui/Panel';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { marcarCancelada, solicitarCancelacion } from '@/app/app/fijos/acciones';

type Servicio = { id: string; nombre: string; dominio: string | null; recurrente?: Recurrente; conocido?: ComercioConocido };
type Paso = 'elegir' | 'detalle' | 'formulario' | 'listo';

// El catálogo de Producto (enlace directo, pasos y truco) va antes que el diccionario interno.
const CONOCIDOS = [...COMERCIOS_DESDE_CATALOGO, ...COMERCIOS];

const PASOS_GENERICOS = ['Entra a tu cuenta del servicio (app o sitio web).', 'Busca "Suscripción", "Plan" o "Facturación" en Ajustes o Perfil.', 'Elige "Cancelar suscripción" y confirma. Guarda el correo de confirmación.', 'Vuelve aquí y marca "Ya la cancelé": vigilamos que el cargo no regrese.'];

/** Flujo de cancelación: elegir servicio → opciones (por ti o tú mismo) → formulario de autorización → listo. */
export function ModalCancelar({ open, onClose, recurrentes, inicial }: { open: boolean; onClose: () => void; recurrentes: Recurrente[]; inicial?: Recurrente | null }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [paso, setPaso] = useState<Paso>(inicial ? 'detalle' : 'elegir');
  const [sel, setSel] = useState<Servicio | null>(inicial ? aServicio(inicial) : null);
  const [form, setForm] = useState({ nombre: '', correo: '', ultimos4: '', notas: '', autorizo: false });
  const [error, setError] = useState<string | null>(null);
  const [modoListo, setModoListo] = useState<'porMi' | 'cancelada'>('porMi');
  const [pendiente, start] = useTransition();

  const propias = useMemo(() => recurrentes.filter((r) => r.activo && !r.canceladoAt && (r.tipo === 'suscripcion' || r.tipo === 'servicio')).map(aServicio), [recurrentes]);
  const conocidos = useMemo(() => {
    const vistos = new Set(propias.map((p) => p.nombre.toLowerCase()));
    const unicos = new Map<string, ComercioConocido>();
    for (const c of CONOCIDOS) if ((c.suscripcion || c.servicio) && c.cancelarUrl && !vistos.has(c.nombre.toLowerCase()) && !unicos.has(c.nombre)) unicos.set(c.nombre, c);
    return Array.from(unicos.values()).map((c) => ({ id: `c:${c.nombre}`, nombre: c.nombre, dominio: c.dominio, conocido: c }) as Servicio);
  }, [propias]);
  const s = q.trim().toLowerCase();
  const listaPropias = propias.filter((p) => !s || p.nombre.toLowerCase().includes(s));
  const listaConocidos = conocidos.filter((p) => !s || p.nombre.toLowerCase().includes(s)).slice(0, s ? 12 : 8);

  const r = sel?.recurrente;
  const conocido = sel?.conocido ?? (r ? CONOCIDOS.find((c) => normalizar(r.nombre).includes(c.patron)) : undefined);
  const mensual = r ? (r.tipo === 'msi' ? r.monto : costoMensual(r)) : 0;

  const cerrar = () => {
    onClose();
    setTimeout(() => { setPaso(inicial ? 'detalle' : 'elegir'); setSel(inicial ? aServicio(inicial) : null); setQ(''); setError(null); }, 200);
  };
  const elegir = (sv: Servicio) => { setSel(sv); setPaso('detalle'); setError(null); };

  const yaCancele = () => {
    if (!r) return;
    start(async () => {
      const res = await marcarCancelada(r.id);
      if (res.ok) { setModoListo('cancelada'); setPaso('listo'); router.refresh(); } else setError(res.error);
    });
  };

  const enviar = () => {
    if (!r) return;
    if (!form.nombre.trim() || !form.correo.trim()) return setError('Escribe el nombre y el correo con los que está registrada la suscripción.');
    if (!form.autorizo) return setError('Necesitamos tu autorización para hablar con el proveedor en tu nombre.');
    const notas = [`Nombre en la cuenta: ${form.nombre.trim()}`, `Correo de la cuenta: ${form.correo.trim()}`, form.ultimos4 ? `Tarjeta termina en: ${form.ultimos4}` : null, form.notas.trim() ? `Notas: ${form.notas.trim()}` : null].filter(Boolean).join('\n');
    start(async () => {
      const res = await solicitarCancelacion(r.id, notas);
      if (res.ok) { setModoListo('porMi'); setPaso('listo'); router.refresh(); } else setError(res.error);
    });
  };

  const titulo = paso === 'elegir' ? '¿Qué quieres cancelar?' : paso === 'listo' ? '' : (
    <span className="flex items-center gap-2">
      {!inicial && <button type="button" onClick={() => setPaso(paso === 'formulario' ? 'detalle' : 'elegir')} aria-label="Atrás" className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-bg-muted dark:hover:bg-surface-2"><ChevronLeft size={18} /></button>}
      {inicial && paso === 'formulario' && <button type="button" onClick={() => setPaso('detalle')} aria-label="Atrás" className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-bg-muted dark:hover:bg-surface-2"><ChevronLeft size={18} /></button>}
      {sel && <Avatar domain={sel.dominio} nombre={sel.nombre} size={30} logoPct={60} />}
      <span className="truncate">{paso === 'formulario' ? `Cancelar ${sel?.nombre} por ti` : sel?.nombre}</span>
    </span>
  );

  return (
    <Panel open={open} onClose={cerrar} mode="modal" title={titulo}>
      {paso === 'elegir' && (
        <div className="space-y-3 pb-2">
          <p className="text-[12.5px] text-txt-2 dark:text-fg-2">Elige un servicio. Te decimos cómo cancelarlo en un minuto o lo cancelamos por ti.</p>
          <label className="relative block">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-txt-3" />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Busca un servicio" className="input pl-11 text-[14px]" />
          </label>
          <div className="max-h-[52dvh] overflow-y-auto">
            {listaPropias.length > 0 && (
              <>
                <div className="section-label mb-1.5 mt-1">Tus suscripciones</div>
                <ul className="divide-y divide-edge">
                  {listaPropias.map((sv, i) => <Fila key={sv.id} sv={sv} sub={`${money(sv.recurrente!.tipo === 'msi' ? sv.recurrente!.monto : costoMensual(sv.recurrente!))}/mes · desde hace ${sv.recurrente!.veces} cobros`} onClick={() => elegir(sv)} delay={i * 30} />)}
                </ul>
              </>
            )}
            {listaConocidos.length > 0 && (
              <>
                <div className="section-label mb-1.5 mt-3">Otros servicios</div>
                <ul className="divide-y divide-edge">
                  {listaConocidos.map((sv, i) => <Fila key={sv.id} sv={sv} sub="Cancelación guiada" onClick={() => elegir(sv)} delay={i * 30} />)}
                </ul>
              </>
            )}
            {listaPropias.length + listaConocidos.length === 0 && <p className="py-8 text-center text-[12.5px] text-txt-2">No encontramos ese servicio. Agrégalo en Gastos fijos y te ayudamos a cancelarlo.</p>}
          </div>
        </div>
      )}

      {paso === 'detalle' && sel && (
        <div className="space-y-4 pb-2">
          {r && (
            <div className="grid grid-cols-3 gap-2">
              {[['Al mes', money(mensual)], ['Al año', money(mensual * 12)], ['Cobros', String(r.veces)]].map(([l, v]) => (
                <div key={l} className="rounded-card bg-bg-muted px-3 py-2.5 dark:bg-surface-2"><div className="text-[10.5px] font-semibold text-txt-2 dark:text-fg-2">{l}</div><div className="font-display text-[16px] font-bold">{v}</div></div>
              ))}
            </div>
          )}
          {r && (
            <div className="relative overflow-hidden rounded-card-lg p-5 text-white" style={{ background: 'linear-gradient(135deg, #0B1F17 0%, #15803D 70%, #16A34A 100%)' }}>
              <span className="inline-flex items-center gap-1 rounded-pill bg-white/15 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.6px]">Incluido en tu plan</span>
              <h3 className="mt-2.5 font-display text-[18px] font-bold tracking-[-0.3px]">Podemos cancelarla por ti</h3>
              <p className="mt-1 text-[12.5px] text-white/80">Nuestro equipo habla con {sel.nombre} en tu nombre. Te confirmamos por correo en menos de 24 horas.</p>
              <Button variant="white" className="mt-4" onClick={() => setPaso('formulario')}>Cancelar por mí <ChevronRight size={16} /></Button>
              <span className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/10" />
            </div>
          )}
          <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.6px] text-txt-3"><span className="h-px flex-1 bg-edge" />{r ? 'o cancélala tú en un minuto' : 'Cómo cancelarla'}<span className="h-px flex-1 bg-edge" /></div>
          {conocido?.cancelarUrl && (
            <a href={conocido.cancelarUrl} target="_blank" rel="noreferrer" className="btn-primary flex h-12 w-full items-center justify-center gap-2 text-[14px]">
              {conocido.requiereLlamada ? <Phone size={17} /> : <ExternalLink size={17} />} {conocido.requiereLlamada ? 'Ver cómo cancelar por teléfono' : 'Ir directo a cancelar'}
            </a>
          )}
          {conocido?.truco && (
            <div className="flex gap-3 rounded-card bg-warning-soft p-3.5 text-[12.5px] leading-relaxed dark:bg-surface-2">
              <AlertTriangle size={18} className="mt-0.5 flex-none text-warning" />
              <div><div className="font-bold">Lo que te van a poner enfrente</div><div className="mt-0.5 text-txt-2 dark:text-fg-2">{conocido.truco}</div></div>
            </div>
          )}
          <ol className="space-y-2 rounded-card border border-edge p-4">
            {(conocido?.pasosCancelacion ?? PASOS_GENERICOS).map((p, i) => (
              <li key={i} className="flex gap-2.5 text-[12.5px] text-txt-2 dark:text-fg-2"><span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-green-50 text-[10.5px] font-bold text-green dark:bg-surface-2">{i + 1}</span>{p}</li>
            ))}
            <li className="flex gap-2.5 text-[12.5px] text-txt-2 dark:text-fg-2"><span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-green-50 text-[10.5px] font-bold text-green dark:bg-surface-2"><ListChecks size={11} /></span>Vuelve aquí y toca &ldquo;Ya la cancelé&rdquo;: si el cargo regresa, te avisamos con el comprobante.</li>
          </ol>
          {error && <p className="text-[12.5px] font-semibold text-negative">{error}</p>}
          {r && <Button variant="outline" size="lg" full disabled={pendiente} onClick={yaCancele}><Check size={18} /> Ya la cancelé</Button>}
        </div>
      )}

      {paso === 'formulario' && sel && r && (
        <div className="space-y-3 pb-2">
          <p className="text-[12.5px] text-txt-2 dark:text-fg-2">Con estos datos contactamos a {sel.nombre}. Nunca te pedimos tu contraseña.</p>
          <Campo label="Nombre en la cuenta" value={form.nombre} onChange={(v) => setForm({ ...form, nombre: v })} placeholder="Como aparece en el servicio" />
          <Campo label="Correo de la cuenta" value={form.correo} onChange={(v) => setForm({ ...form, correo: v })} placeholder="tu@correo.com" type="email" />
          <Campo label="Últimos 4 dígitos de la tarjeta (opcional)" value={form.ultimos4} onChange={(v) => setForm({ ...form, ultimos4: v.replace(/\D/g, '').slice(0, 4) })} placeholder="1234" inputMode="numeric" />
          <label className="block">
            <span className="mb-1 block text-[12px] font-semibold text-txt-2 dark:text-fg-2">Notas (opcional)</span>
            <textarea value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} rows={3} placeholder="Algo que debamos saber: plan, fecha de corte, si ya intentaste cancelar…" className="input resize-none text-[13.5px]" />
          </label>
          <label className="flex items-start gap-3 rounded-card bg-bg-muted p-3.5 text-[12.5px] leading-relaxed dark:bg-surface-2">
            <input type="checkbox" checked={form.autorizo} onChange={(e) => setForm({ ...form, autorizo: e.target.checked })} className="mt-0.5 h-4 w-4 flex-none accent-green" />
            <span>Autorizo a MoneyMaker a contactar a {sel.nombre} en mi nombre para cancelar esta suscripción. Entiendo que no se comparten contraseñas y que puedo retirar la solicitud cuando quiera.</span>
          </label>
          {error && <p className="text-[12.5px] font-semibold text-negative">{error}</p>}
          <Button variant="green" size="lg" full disabled={pendiente} onClick={enviar}>{pendiente ? 'Enviando…' : 'Enviar solicitud'}</Button>
          <p className="flex items-center justify-center gap-1.5 text-[11px] text-txt-3"><ShieldCheck size={13} /> Sin costo extra. Incluido en tu plan.</p>
        </div>
      )}

      {paso === 'listo' && sel && (
        <div className="py-8 text-center">
          <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green text-white animate-pop"><Check size={32} strokeWidth={3} /></span>
          <h3 className="font-display text-[22px] font-bold tracking-[-0.5px]">{modoListo === 'cancelada' ? 'Listo' : 'Solicitud recibida'}</h3>
          <p className="mx-auto mt-1.5 max-w-[340px] text-[13px] text-txt-2 dark:text-fg-2">
            {modoListo === 'cancelada' ? `Dejamos de contar ${sel.nombre}. Si el cargo vuelve a aparecer te avisamos.` : `Te escribimos en menos de 24 horas para confirmar la cancelación de ${sel.nombre}.`}
          </p>
          {mensual > 0 && <p className="mt-4 font-display text-[18px] font-bold text-green">Ahorras {money(mensual * 12)} al año</p>}
          <Button className="mt-6" onClick={cerrar}>Cerrar</Button>
        </div>
      )}
    </Panel>
  );
}

function aServicio(r: Recurrente): Servicio {
  return { id: r.id, nombre: r.nombre, dominio: r.comercioDominio ?? null, recurrente: r };
}

function Fila({ sv, sub, onClick, delay }: { sv: Servicio; sub: string; onClick: () => void; delay: number }) {
  return (
    <li className="animate-rise" style={{ animationDelay: `${delay}ms` }}>
      <button type="button" onClick={onClick} className="flex h-14 w-full items-center gap-3 rounded-input px-2 text-left transition-colors hover:bg-bg-hover dark:hover:bg-surface-2">
        <Avatar domain={sv.dominio} nombre={sv.nombre} size={38} logoPct={58} />
        <span className="min-w-0 flex-1"><span className="block truncate text-[13.5px] font-bold">{sv.nombre}</span><span className="block truncate text-[11px] text-txt-2 dark:text-fg-2">{sub}</span></span>
        <ChevronRight size={16} className="text-txt-3" />
      </button>
    </li>
  );
}

function Campo({ label, value, onChange, placeholder, type = 'text', inputMode }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; inputMode?: 'numeric' | 'text' }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-semibold text-txt-2 dark:text-fg-2">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} type={type} inputMode={inputMode} className="input text-[13.5px]" />
    </label>
  );
}
