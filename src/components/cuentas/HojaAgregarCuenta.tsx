'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileUp, Landmark, Mail, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { TEXTOS } from '@/lib/textos';
import { Panel } from '@/components/ui/Panel';
import { ModalBancos } from './ModalBancos';
import type { DatosInicio } from '@/components/inicio/tipos';

type Props = {
  open: boolean;
  onClose: () => void;
  bancoSugerido?: string | null;
  /** Instituciones y agregador (Belvo o mock). Sin ellos, la opción de banco manda a Importar. */
  instituciones?: DatosInicio['instituciones'];
  agregador?: DatosInicio['agregador'];
  sandbox?: boolean;
};

/** "Agregar cuenta": conectar el banco (Belvo), subir el estado de cuenta o conectar el correo. Las tres activas. */
export function HojaAgregarCuenta({ open, onClose, bancoSugerido, instituciones, agregador, sandbox }: Props) {
  const router = useRouter();
  const [bancos, setBancos] = useState(false);
  const t = TEXTOS.modal;
  const opciones = [
    { id: 'banco', icon: Landmark, titulo: t.opciones.banco.titulo, texto: t.opciones.banco.texto },
    { id: 'pdf', icon: FileUp, titulo: t.opciones.pdf.titulo, texto: t.opciones.pdf.texto },
    { id: 'correo', icon: Mail, titulo: t.opciones.correo.titulo, texto: t.opciones.correo.texto },
  ];
  const elegir = (id: string) => {
    if (id === 'banco' && instituciones?.length && agregador) {
      setBancos(true);
      return;
    }
    onClose();
    if (id === 'correo') router.push('/app/ajustes?sec=fuentes');
    else router.push(bancoSugerido ? `/app/importar?banco=${encodeURIComponent(bancoSugerido)}` : '/app/importar');
  };

  return (
    <>
      <Panel open={open && !bancos} onClose={onClose} mode="modal" title={t.titulo}>
        <ul className="space-y-2 pb-2">
          {opciones.map((o, i) => {
            const Icon = o.icon;
            return (
              <li key={o.id} className="animate-rise" style={{ animationDelay: `${60 + i * 70}ms` }}>
                <button type="button" onClick={() => elegir(o.id)} className={cn('flex w-full items-center gap-3.5 rounded-card border border-edge bg-surface px-4 py-3.5 text-left transition-all hover:border-green hover:shadow-hover')}>
                  <span className={cn('flex h-11 w-11 flex-none items-center justify-center rounded-full', o.id === 'banco' ? 'bg-green text-white' : 'bg-green-50 text-green-dark dark:bg-surface-2 dark:text-green-light')}>
                    <Icon size={20} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-bold">{o.titulo}</span>
                    <span className="block text-[12px] text-txt-2 dark:text-fg-2">{o.texto}</span>
                  </span>
                  <ChevronRight size={18} className="text-txt-3" />
                </button>
              </li>
            );
          })}
        </ul>
        <p className="pb-1 text-center text-[11px] text-txt-3">Solo lectura. El PDF se descarta; con Belvo tus claves van en su ventana segura y nosotros nunca las vemos.</p>
      </Panel>
      {instituciones && agregador && (
        <ModalBancos open={open && bancos} onClose={() => { setBancos(false); onClose(); }} instituciones={instituciones} agregador={agregador} sandbox={sandbox} />
      )}
    </>
  );
}
