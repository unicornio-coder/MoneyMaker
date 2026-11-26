'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ExternalLink, ChevronRight, Check, ChevronLeft, AlertTriangle, Phone, Copy } from 'lucide-react';
import { cn } from '@/lib/cn';
import { money } from '@/lib/format';
import { COMERCIOS, type ComercioConocido } from '@/lib/domain/comercios';
import { COMERCIOS_DESDE_CATALOGO } from '@/lib/domain/catalogo';
import { normalizar } from '@/lib/domain/texto';
import { costoMensual } from '@/lib/domain/recurrentes';
import type { Recurrente } from '@/lib/domain/tipos';
import { Panel } from '@/components/ui/Panel';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { marcarCancelada } from '@/app/app/fijos/acciones';

type Servicio = { id: string; nombre: string; dominio: string | null; recurrente?: Recurrente; conocido?: ComercioConocido };
type Paso = 'elegir' | 'detalle' | 'listo';

// El catálogo de Producto (enlace directo, pasos y truco) va antes que el diccionario interno.
const CONOCIDOS = [...COMERCIOS_DESDE_CATALOGO, ...COMERCIOS];

const PASOS_GENERICOS = ['Entra a tu cuenta del servicio (app o sitio web).', 'Busca "Suscripción", "Plan" o "Facturación" en Ajustes o Perfil.', 'Elige "Cancelar suscripción" y confirma. Guarda el correo de confirmación.', 'Vuelve aquí y marca "Ya la cancelé": vigilamos que el cargo no regrese.'];
const PASO_VOLVER = 'Vuelve aquí y toca "Ya la cancelé": si el cargo regresa, te avisamos.';

/**
 * Flujo de cancelación: elegir servicio → enlace directo a la página donde se cancela, con los pasos → "Ya la cancelé".
 * MoneyMaker no manda cartas ni cancela por el usuario: lo lleva al lugar exacto y vigila que el cargo no regrese.
 */
export function ModalCancelar({ open, onClose, recurrentes, inicial }: { open: boolean; onClose: () => void; recurrentes: Recurrente[]; inicial?: Recurrente | null }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [paso, setPaso] = useState<Paso>(inicial ? 'detalle' : 'elegir');
  const [sel, setSel] = useState<Servicio | null>(inicial ? aServicio(inicial) : null);
  const [error, setError] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
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
    setTimeout(() => { setPaso(inicial ? 'detalle' : 'elegir'); setSel(inicial ? aServicio(inicial) : null); setQ(''); setError(null); setCopiado(false); }, 200);
  };
  const elegir = (sv: Servicio) => { setSel(sv); setPaso('detalle'); setError(null); setCopiado(false); };

  const yaCancele = () => {
    if (!r) return;
    start(async () => {
      const res = await marcarCancelada(r.id);
      if (res.ok) { setPaso('listo'); router.refresh(); } else setError(res.error);
    });
  };

  // Enlace a donde se cancela: el directo del catálogo, o el sitio del servicio si no lo conocemos.
  const enlace = conocido?.cancelarUrl ?? (sel?.dominio ? `https://${sel.dominio}` : null);
  const enlaceDirecto = !!conocido?.cancelarUrl;
  const copiar = async () => {
    if (!enlace) return;
    try {
      await navigator.clipboard.writeText(enlace);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  };

  const titulo = paso === 'elegir' ? '¿Qué quieres cancelar?' : paso === 'listo' ? '' : (
    <span className="flex items-center gap-2">
      {!inicial && <button type="button" onClick={() => setPaso('elegir')} aria-label="Atrás" className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-bg-muted"><ChevronLeft size={18} /></button>}
      {sel && <Avatar domain={sel.dominio} nombre={sel.nombre} size={30} logoPct={60} />}
      <span className="truncate">{sel?.nombre}</span>
    </span>
  );

  return (
    <Panel open={open} onClose={cerrar} mode="modal" title={titulo}>
      {paso === 'elegir' && (
        <div className="space-y-3 pb-2">
          <p className="text-[12.5px] text-txt-2 dark:text-fg-2">Elige un servicio y te llevamos directo a la página donde se cancela.</p>
          <label className="relative block">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-txt-3" />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Busca un servicio" className="input pl-11 text-[14px]" />
          </label>
          <div className="max-h-[52dvh] overflow-y-auto">
            {listaPropias.length > 0 && (
              <>
                <div className="section-label mb-1.5 mt-1">Tus suscripciones</div>
                <ul className="divide-y divide-edge">
                  {listaPropias.map((sv, i) => <Fila key={sv.id} sv={sv} sub={`${money(sv.recurrente!.tipo === 'msi' ? sv.recurrente!.monto : costoMensual(sv.recurrente!))}/mes · desde hace ${sv.recurrente!.veces} ${sv.recurrente!.veces === 1 ? 'cobro' : 'cobros'}`} onClick={() => elegir(sv)} delay={i * 30} />)}
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
            {listaPropias.length + listaConocidos.length === 0 && <p className="py-8 text-center text-[12.5px] text-txt-2">No encontramos ese servicio. Agrégalo en Suscripciones con &ldquo;Nuevo&rdquo; y te ayudamos a cancelarlo.</p>}
          </div>
        </div>
      )}

      {paso === 'detalle' && sel && (
        <div className="space-y-4 pb-2">
          {r && (
            <div className="grid grid-cols-3 gap-2">
              {[['Al mes', money(mensual)], ['Al año', money(mensual * 12)], ['Cobros', String(r.veces)]].map(([l, v]) => (
                <div key={l} className="rounded-card bg-bg-muted px-3 py-2.5"><div className="text-[10.5px] font-semibold text-txt-2">{l}</div><div className="font-display text-[16px] font-bold">{v}</div></div>
              ))}
            </div>
          )}
          {enlace && (
            <div className="rounded-card-lg bg-ink p-5 text-white">
              <h3 className="font-display text-[18px] font-bold tracking-[-0.3px]">{enlaceDirecto ? `Cancela ${sel.nombre} aquí` : `Cancela desde el sitio de ${sel.nombre}`}</h3>
              <p className="mt-1 text-[12.5px] text-white/70">{conocido?.requiereLlamada ? `${sel.nombre} solo cancela por teléfono: este enlace te dice a dónde llamar.` : enlaceDirecto ? 'Te llevamos a la página exacta donde se cancela. Entra con tu cuenta y confirma.' : 'Entra con tu cuenta y busca Suscripción o Facturación.'}</p>
              <a href={enlace} target="_blank" rel="noreferrer" className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-pill bg-white text-[14px] font-bold text-ink transition-colors hover:bg-green-50">
                {conocido?.requiereLlamada ? <Phone size={17} /> : <ExternalLink size={17} />} {enlaceDirecto ? 'Ir directo a cancelar' : `Ir a ${sel.nombre}`}
              </a>
              <div className="mt-3 flex items-center gap-2 rounded-input bg-white/10 py-1.5 pl-3 pr-1.5">
                <span className="min-w-0 flex-1 truncate text-[12px] text-white/70">{enlace.replace(/^https?:\/\//, '')}</span>
                <button type="button" onClick={copiar} className="flex h-8 flex-none items-center gap-1.5 rounded-pill bg-white/10 px-3 text-[11.5px] font-semibold text-white hover:bg-white/15">
                  {copiado ? <Check size={13} /> : <Copy size={13} />} {copiado ? 'Copiado' : 'Copiar enlace'}
                </button>
              </div>
            </div>
          )}
          {conocido?.truco && (
            <div className="flex gap-3 rounded-card bg-warning-soft p-3.5 text-[12.5px] leading-relaxed">
              <AlertTriangle size={18} className="mt-0.5 flex-none text-warning" />
              <div><div className="font-bold">Lo que te van a poner enfrente</div><div className="mt-0.5 text-txt-2">{conocido.truco}</div></div>
            </div>
          )}
          <ol className="space-y-2 rounded-card border border-edge p-4">
            {(conocido?.pasosCancelacion ? [...conocido.pasosCancelacion, PASO_VOLVER] : PASOS_GENERICOS).map((p, i) => (
              <li key={i} className="flex gap-2.5 text-[12.5px] text-txt-2"><span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-green-50 text-[10.5px] font-bold text-green-dark">{i + 1}</span>{p}</li>
            ))}
          </ol>
          {error && <p className="text-[12.5px] font-semibold text-negative">{error}</p>}
          {r && <Button variant="outline" size="lg" full disabled={pendiente} onClick={yaCancele}><Check size={18} /> Ya la cancelé</Button>}
        </div>
      )}

      {paso === 'listo' && sel && (
        <div className="py-8 text-center">
          <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green text-white animate-pop"><Check size={32} strokeWidth={3} /></span>
          <h3 className="font-display text-[22px] font-bold tracking-[-0.5px]">Listo</h3>
          <p className="mx-auto mt-1.5 max-w-[340px] text-[13px] text-txt-2">Dejamos de contar {sel.nombre}. Si el cargo vuelve a aparecer, te avisamos.</p>
          {mensual > 0 && <p className="mt-4 font-display text-[18px] font-bold text-green-dark">Ahorras {money(mensual * 12)} al año</p>}
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
