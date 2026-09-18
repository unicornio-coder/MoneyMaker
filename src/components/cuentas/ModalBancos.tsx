'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Check, Upload } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Panel } from '@/components/ui/Panel';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { conectarInstitucion, registrarLinkBelvo, type ResultadoConexion } from '@/app/app/acciones';
import { ConectandoBanco, type EstadoConexion } from './ConectandoBanco';
import type { DatosInicio } from '@/components/inicio/tipos';
import { abrirWidgetBelvo } from './belvoWidget';

type Props = { open: boolean; onClose: () => void; instituciones: DatosInicio['instituciones']; agregador: 'belvo' | 'mock'; sandbox?: boolean };

export function ModalBancos({ open, onClose, instituciones, agregador, sandbox }: Props) {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [estado, setEstado] = useState('');
  const [conexion, setConexion] = useState<{ banco: { nombre: string; dominio?: string | null }; estado: EstadoConexion; resultado?: ResultadoConexion | null; error?: string | null } | null>(null);
  const [pendiente, startTransition] = useTransition();
  const router = useRouter();

  const lista = useMemo(() => {
    const s = q.trim().toLowerCase();
    return instituciones.filter((i) => !s || i.nombre.toLowerCase().includes(s));
  }, [instituciones, q]);
  const inst = instituciones.find((i) => i.id === sel) ?? null;

  const conectar = () => {
    if (!inst) return;
    setError(null);
    if (inst.id === 'bitso') {
      router.push('/app/ajustes?sec=fuentes');
      onClose();
      return;
    }
    if (!inst.automatica) {
      router.push(`/app/importar?banco=${encodeURIComponent(inst.nombre)}`);
      onClose();
      return;
    }
    if (agregador === 'belvo') {
      // Solo preseleccionamos si la institución viene de la lista viva de Belvo; si es de nuestro catálogo (o sandbox), el widget muestra su propia lista.
      const preseleccion = inst.origen === 'belvo' && !sandbox ? inst.id : undefined;
      abrirWidgetBelvo({
        institucion: preseleccion,
        onEstado: setEstado,
        onSuccess: (link, institution) => {
          setEstado('');
          setConexion({ banco: { nombre: inst.nombre, dominio: inst.dominio }, estado: 'proceso' });
          startTransition(async () => {
            const r = await registrarLinkBelvo(link, institution);
            setConexion((c) => c && (r.ok ? { ...c, estado: 'listo', resultado: r.resultado } : { ...c, estado: 'error', error: r.error }));
          });
        },
        onExit: () => setEstado(''),
        onError: (m) => setError(m),
      });
      return;
    }
    setConexion({ banco: { nombre: inst.nombre, dominio: inst.dominio }, estado: 'proceso' });
    startTransition(async () => {
      const r = await conectarInstitucion(inst.id, inst.nombre);
      setConexion((c) => c && (r.ok ? { ...c, estado: 'listo', resultado: r.resultado } : { ...c, estado: 'error', error: r.error }));
    });
  };

  const terminar = () => {
    setConexion(null);
    onClose();
    router.refresh();
  };

  return (
    <>
    {conexion && (
      <ConectandoBanco banco={conexion.banco} estado={conexion.estado} resultado={conexion.resultado} error={conexion.error} onCerrar={() => setConexion(null)} onListo={terminar} onReintentar={() => { setConexion(null); conectar(); }} />
    )}
    <Panel open={open} onClose={onClose} mode="modal" title="Vincular banco">
      <div className="space-y-3 pb-2">
        <p className="text-[12.5px] text-txt-2 dark:text-fg-2">Solo lectura vía Belvo. Nunca guardamos tus claves bancarias.</p>
        <label className="relative block">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-txt-3" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Busca tu banco" className="input pl-11 text-[14px]" />
        </label>
        <ul className="max-h-[46dvh] divide-y divide-edge overflow-y-auto">
          {lista.map((i) => (
            <li key={i.id}>
              <button type="button" onClick={() => setSel(i.id)} className={cn('flex h-14 w-full items-center gap-3 rounded-input px-2 text-left transition-colors', sel === i.id ? 'bg-green-50 dark:bg-surface-2' : 'hover:bg-bg-hover dark:hover:bg-surface-2')}>
                <Avatar domain={i.dominio} nombre={i.nombre} size={40} logoPct={60} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-bold">{i.nombre}</span>
                  <span className="block text-[11px] text-txt-2 dark:text-fg-2">{i.automatica ? 'Conexión automática' : 'Por estado de cuenta'}</span>
                </span>
                {sel === i.id ? <Check size={18} className="text-green" /> : !i.automatica ? <Upload size={16} className="text-txt-3" /> : null}
              </button>
            </li>
          ))}
          {lista.length === 0 && <li className="py-6 text-center text-[12.5px] text-txt-2">No encontramos ese banco. Sube su estado de cuenta desde Importar.</li>}
        </ul>
        {agregador === 'belvo' && sandbox && (
          <p className="rounded-input bg-bg-muted px-3 py-2 text-[12px] text-txt-2 dark:bg-surface-2 dark:text-fg-2">Modo de prueba de Belvo: en la ventana que se abre elige cualquier banco y entra con usuario <span className="font-semibold text-fg">bnk100</span> y contraseña <span className="font-semibold text-fg">full</span>. Verás cuentas y movimientos de prueba.</p>
        )}
        {estado && <p className="text-[12.5px] font-semibold text-green">{estado}</p>}
        {error && <p className="text-[12.5px] font-semibold text-negative">{error}</p>}
        <Button variant="green" size="lg" full disabled={!inst || pendiente || !!estado} onClick={conectar}>
          {pendiente || estado ? 'Conectando…' : inst ? (inst.automatica ? `Conectar ${inst.nombre}` : `Subir estado de cuenta de ${inst.nombre}`) : 'Elige un banco'}
        </Button>
      </div>
    </Panel>
    </>
  );
}
