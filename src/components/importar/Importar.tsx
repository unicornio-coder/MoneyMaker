'use client';

import { useRef, useState } from 'react';
import { ConectandoBanco } from '@/components/cuentas/ConectandoBanco';
import { infoBanco } from '@/lib/domain/comercios';
import { useRouter } from 'next/navigation';
import { Upload, FileText, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/cn';
import { money, fechaCorta } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

type CuentaOpcion = { id: string; nombre: string; banco: string; tipo: string };
type Vista = { movimientos: number; cargos: number; abonos: number; desde: string | null; hasta: string | null; banco: string | null; ultimos4: string | null; formato: string; advertencias: string[]; muestra: { fecha: string; descripcion: string; monto: number; esAbono: boolean }[] };

export function Importar({ cuentas, bancoSugerido }: { cuentas: CuentaOpcion[]; bancoSugerido?: string }) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [vista, setVista] = useState<Vista | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [destino, setDestino] = useState<string>('nueva');
  const [banco, setBanco] = useState(bancoSugerido ?? '');
  const [tipo, setTipo] = useState<'debito' | 'credito' | 'inversion'>('debito');
  const [ultimos4, setUltimos4] = useState('');
  const [listo, setListo] = useState<{ insertados: number; duplicados: number; recurrentes: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const elegir = async (f: File) => {
    setArchivo(f);
    setVista(null);
    setListo(null);
    setError(null);
    setCargando(true);
    const fd = new FormData();
    fd.append('archivo', f);
    fd.append('modo', 'vista');
    try {
      const res = await fetch('/api/importar', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'No pudimos leer el archivo.');
      setVista(json as Vista);
      if (!banco && json.banco) setBanco(json.banco);
      if (!ultimos4 && json.ultimos4) setUltimos4(json.ultimos4);
      const existente = cuentas.find((c) => json.banco && c.banco.toLowerCase() === String(json.banco).toLowerCase());
      if (existente) setDestino(existente.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al leer el archivo.');
    } finally {
      setCargando(false);
    }
  };

  const [procesando, setProcesando] = useState<'proceso' | 'listo' | 'error' | null>(null);
  const confirmar = async () => {
    if (!archivo) return;
    setCargando(true);
    setProcesando('proceso');
    setError(null);
    const fd = new FormData();
    fd.append('archivo', archivo);
    fd.append('modo', 'confirmar');
    if (destino !== 'nueva') fd.append('cuentaId', destino);
    else {
      fd.append('banco', banco);
      fd.append('tipo', tipo);
      fd.append('ultimos4', ultimos4);
    }
    try {
      const res = await fetch('/api/importar', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'No pudimos importar.');
      setListo(json);
      setProcesando('listo');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al importar.');
      setProcesando('error');
    } finally {
      setCargando(false);
    }
  };

  const nombreBanco = (destino !== 'nueva' ? cuentas.find((c) => c.id === destino)?.banco : banco) || 'tu banco';
  const bancoInfo = infoBanco(nombreBanco);
  if (procesando) {
    return (
      <ConectandoBanco
        banco={{ nombre: bancoInfo.nombre || nombreBanco, dominio: bancoInfo.dominio }}
        estado={procesando}
        titulo={`Leyendo tu estado de cuenta de ${bancoInfo.nombre || nombreBanco}`}
        pasos={['Leyendo el archivo', 'Detectando movimientos', 'Categorizando cada compra', 'Detectando suscripciones y meses sin intereses', 'Actualizando tu presupuesto']}
        resultado={listo ? { cuentas: 1, movimientos: listo.insertados, suscripciones: listo.recurrentes } : null}
        error={error}
        ctaListo="Ver mi Inicio"
        onCerrar={() => setProcesando(null)}
        onListo={() => router.push('/app')}
        onReintentar={() => { setProcesando(null); confirmar(); }}
      />
    );
  }

  if (listo) {
    return (
      <div className="card mx-auto max-w-[520px] px-6 py-10 text-center">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green text-white"><Check size={28} strokeWidth={3} /></span>
        <h2 className="font-display text-[20px] font-bold">Listo: {listo.insertados} movimientos nuevos</h2>
        <p className="mt-1.5 text-[13px] text-txt-2 dark:text-fg-2">
          {listo.duplicados > 0 ? `${listo.duplicados} ya los teníamos. ` : ''}Detectamos {listo.recurrentes} gastos fijos o suscripciones y actualizamos tu presupuesto.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button onClick={() => router.push('/app')}>Ver mi Inicio</Button>
          <Button variant="outline" onClick={() => { setListo(null); setArchivo(null); setVista(null); }}>Subir otro</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[640px] space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setArrastrando(true); }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(e) => { e.preventDefault(); setArrastrando(false); const f = e.dataTransfer.files?.[0]; if (f) elegir(f); }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        className={cn('flex cursor-pointer flex-col items-center justify-center rounded-card-xl border-2 border-dashed px-6 py-12 text-center transition-colors', arrastrando ? 'border-green bg-green-50 dark:bg-surface-2' : 'border-line-dashed bg-surface hover:bg-bg-hover dark:border-edge-2 dark:hover:bg-surface-2')}
      >
        <input ref={inputRef} type="file" accept=".csv,.txt,.xlsx,.xls,.pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) elegir(f); }} />
        <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green dark:bg-surface-2 dark:text-green-light">
          {archivo ? <FileText size={26} /> : <Upload size={26} />}
        </span>
        <div className="font-display text-[17px] font-bold">{archivo ? archivo.name : 'Arrastra tu estado de cuenta'}</div>
        <p className="mt-1 text-[12.5px] text-txt-2 dark:text-fg-2">PDF, CSV o Excel de cualquier banco: BBVA, Nu, Banorte, Amex, GBM+, Bitso, CetesDirecto…</p>
        {cargando && !vista && <p className="mt-3 text-[12.5px] font-semibold text-green">Leyendo…</p>}
      </div>

      {error && (
        <p className="flex items-center gap-2 rounded-input bg-warning-soft px-3.5 py-2.5 text-[12.5px] font-semibold text-fg dark:bg-surface-2"><AlertCircle size={16} className="text-warning" /> {error}</p>
      )}

      {vista && (
        <div className="card space-y-4 p-5">
          <div className="grid grid-cols-3 gap-2">
            {[['Movimientos', String(vista.movimientos)], ['Cargos', String(vista.cargos)], ['Abonos', String(vista.abonos)]].map(([l, v]) => (
              <div key={l} className="rounded-card bg-bg-page px-3 py-2.5 dark:bg-surface-2">
                <div className="text-[10.5px] font-semibold text-txt-2 dark:text-fg-2">{l}</div>
                <div className="font-display text-[18px] font-bold">{v}</div>
              </div>
            ))}
          </div>
          {vista.desde && vista.hasta && <p className="text-[12.5px] text-txt-2 dark:text-fg-2">Del {fechaCorta(vista.desde)} al {fechaCorta(vista.hasta)}{vista.banco ? ` · ${vista.banco}` : ''}{vista.ultimos4 ? ` · ···· ${vista.ultimos4}` : ''}</p>}
          {vista.advertencias.map((a) => (
            <p key={a} className="flex items-center gap-2 text-[12px] text-txt-2 dark:text-fg-2"><AlertCircle size={14} className="text-warning" /> {a}</p>
          ))}
          {vista.muestra.length > 0 && (
            <ul className="divide-y divide-edge rounded-card border border-edge">
              {vista.muestra.map((m, i) => (
                <li key={i} className="flex items-center gap-3 px-3 py-2 text-[12.5px]">
                  <span className="w-12 flex-none text-txt-2 dark:text-fg-2">{fechaCorta(m.fecha)}</span>
                  <span className="min-w-0 flex-1 truncate">{m.descripcion}</span>
                  <span className={cn('font-display font-bold', m.esAbono ? 'text-green' : '')}>{m.esAbono ? '+' : ''}{money(m.monto)}</span>
                </li>
              ))}
            </ul>
          )}

          {vista.movimientos > 0 && (
            <div className="space-y-3 border-t border-edge pt-4">
              <div className="text-[13px] font-bold">¿A qué cuenta pertenece?</div>
              <select value={destino} onChange={(e) => setDestino(e.target.value)} className="input text-[13.5px]">
                <option value="nueva">Cuenta nueva</option>
                {cuentas.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}{c.tipo === 'credito' ? ' (crédito)' : ''}</option>
                ))}
              </select>
              {destino === 'nueva' && (
                <div className="grid gap-3 sm:grid-cols-3">
                  <Input label="Banco" value={banco} onChange={(e) => setBanco(e.target.value)} placeholder="BBVA, Nu, GBM+…" />
                  <label className="block">
                    <span className="mb-1.5 block text-[12.5px] font-semibold">Tipo</span>
                    <select value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)} className="input text-[13.5px]">
                      <option value="debito">Débito</option>
                      <option value="credito">Crédito</option>
                      <option value="inversion">Inversión</option>
                    </select>
                  </label>
                  <Input label="Últimos 4 dígitos" value={ultimos4} onChange={(e) => setUltimos4(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="7710" inputMode="numeric" />
                </div>
              )}
              <Button variant="green" size="lg" full disabled={cargando || (destino === 'nueva' && !banco.trim())} onClick={confirmar}>
                {cargando ? 'Importando…' : `Importar ${vista.movimientos} movimientos`}
              </Button>
            </div>
          )}
        </div>
      )}

      <p className="text-center text-[11px] text-txt-3">El archivo se procesa y no se comparte con nadie. Los movimientos repetidos se ignoran automáticamente.</p>
    </div>
  );
}
