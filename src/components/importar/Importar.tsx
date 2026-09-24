'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileText, Check, AlertCircle, X, RotateCcw, Lock, Pencil, ChevronRight, Trash2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { money, fechaCorta, pluralize } from '@/lib/format';
import { formatearCentavos } from '@/lib/domain/money';
import { infoBanco } from '@/lib/domain/comercios';
import type { Importacion, MovimientoNormalizado, TipoCuentaEstado } from '@/lib/domain/tipos';
import { TEXTOS, t, textoError } from '@/lib/textos';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { ConectandoBanco } from '@/components/cuentas/ConectandoBanco';
import { EscenaConexion, MOVIMIENTOS_DEMO, type MovimientoDemo } from '@/components/landing/EscenaConexion';
import { aplicarDiasDePago } from '@/app/app/acciones';

type CuentaOpcion = { id: string; nombre: string; banco: string; tipo: string; ultimos4: string | null };
type EstadoArchivo = 'en_cola' | 'subiendo' | 'leyendo' | 'contraseña' | 'revisar' | 'error';
type Item = { key: string; nombre: string; tamano: number; file: File | null; estado: EstadoArchivo; progreso: number; codigo: string | null; importacion: Importacion | null; intentos: number; etapa?: Importacion['etapa']; inicio?: number | null };

const ETAPAS: Record<string, string> = { subido: 'Recibido', leyendo: 'Leyendo el documento', extrayendo: 'Detectando banco, tarjeta, periodo y movimientos', cuadrando: 'Cuadrando totales', listo: 'Listo' };
const INTERVALO_CONSULTA = 1500;
const MAX_ESPERA_MS = 300_000;

/** Segundos que suele tardar la lectura según el tamaño (≈ 70 KB por página; el modelo tarda ~2.5 s por página). */
function estimarSegundos(bytes: number): number {
  const paginas = Math.max(1, Math.round(bytes / 70_000));
  return Math.min(90, 6 + Math.round(paginas * 2.5));
}

/** Consulta la importación hasta que deje de estar `procesando`. Avisa cada cambio de etapa. */
async function esperar(id: string, onEtapa: (imp: Importacion) => void): Promise<{ status: number; json: { importacion?: Importacion; codigo?: string } | null }> {
  const inicio = Date.now();
  let ultimaEtapa: string | null = null;
  while (Date.now() - inicio < MAX_ESPERA_MS) {
    await new Promise((r) => setTimeout(r, INTERVALO_CONSULTA));
    let res: Response;
    try {
      res = await fetch(`/api/imports/${id}`, { cache: 'no-store' });
    } catch {
      continue;
    }
    if (res.status === 401) return { status: 401, json: null };
    if (res.status === 404) return { status: 404, json: { codigo: 'servidor' } };
    const json = (await res.json().catch(() => null)) as { importacion?: Importacion } | null;
    const imp = json?.importacion;
    if (!imp) continue;
    if (imp.estado !== 'procesando') return { status: imp.error === 'ya_subido' ? 409 : imp.estado === 'error' ? 422 : 200, json: { importacion: imp, codigo: imp.error ?? undefined } };
    if (imp.etapa !== ultimaEtapa) {
      ultimaEtapa = imp.etapa ?? null;
      onEtapa(imp);
    }
  }
  return { status: 504, json: { codigo: 'servidor' } };
}
type Ajuste = { institucion: string; tipoCuenta: TipoCuentaEstado; ultimos4: string };
type Resultado = {
  resultados: { id: string; ok: boolean; cuentaId?: string; insertados: number; duplicados: number; codigo?: string }[];
  cuentaIds: string[];
  totales: { cuentas: number; movimientos: number; duplicados: number; suscripciones: number; msi: number };
  propuestaQuincena: { dias: number[]; depositos: number; ingresoQuincenal: number; actual: number[]; esDistinta: boolean } | null;
};

const MAX_ARCHIVOS = 10;
const MAX_BYTES = 10 * 1024 * 1024;
const PARALELO = 3;
const EXT_OK = /\.(pdf|csv|txt|xlsx|xls)$/i;

let contador = 0;
const nuevaKey = () => `a${Date.now().toString(36)}${(++contador).toString(36)}`;

function subir(file: File, contraseña: string | null, onProgreso: (pct: number) => void, onLeyendo: () => void): Promise<{ status: number; json: { importacion?: Importacion; codigo?: string } | null }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/imports');
    xhr.timeout = 310_000;
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgreso(Math.round((e.loaded / e.total) * 100));
    xhr.upload.onload = () => onLeyendo();
    xhr.onload = () => {
      try {
        resolve({ status: xhr.status, json: JSON.parse(xhr.responseText) });
      } catch {
        resolve({ status: xhr.status, json: null });
      }
    };
    xhr.onerror = () => reject(new Error('sin_conexion'));
    xhr.ontimeout = () => reject(new Error('servidor'));
    const fd = new FormData();
    fd.append('archivo', file);
    if (contraseña) fd.append('contraseña', contraseña);
    xhr.send(fd);
  });
}

function itemDeImportacion(imp: Importacion): Item {
  return { key: `p${imp.id}`, nombre: imp.archivo, tamano: imp.tamanoBytes, file: null, estado: 'revisar', progreso: 100, codigo: null, importacion: imp, intentos: 0 };
}

function ajusteDe(imp: Importacion, bancoSugerido?: string): Ajuste {
  return { institucion: imp.resumen.institucion ?? bancoSugerido ?? '', tipoCuenta: imp.resumen.tipoCuenta ?? 'credito', ultimos4: imp.resumen.ultimos4 ?? '' };
}

export function Importar({ cuentas, pendientes, bancoSugerido }: { cuentas: CuentaOpcion[]; pendientes: Importacion[]; bancoSugerido?: string }) {
  const [items, setItems] = useState<Item[]>(() => pendientes.map(itemDeImportacion));
  const [ajustes, setAjustes] = useState<Record<string, Ajuste>>(() => Object.fromEntries(pendientes.map((p) => [`p${p.id}`, ajusteDe(p, bancoSugerido)])));
  const [editando, setEditando] = useState<string | null>(null);
  const [editandoMovs, setEditandoMovs] = useState<string | null>(null);
  const [ediciones, setEdiciones] = useState<Record<string, MovimientoNormalizado[]>>({});
  const [guardandoMovs, setGuardandoMovs] = useState<string | null>(null);
  const [contraseñas, setContraseñas] = useState<Record<string, string>>({});
  const [arrastrando, setArrastrando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [confirmando, setConfirmando] = useState<'proceso' | 'error' | null>(null);
  const [errorConfirmar, setErrorConfirmar] = useState<string | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [quincena, setQuincena] = useState<'pendiente' | 'aplicando' | 'aplicada' | 'omitida'>('pendiente');
  const enCurso = useRef(new Set<string>());
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const i = window.setInterval(() => setTick((x) => x + 1), 2500);
    return () => window.clearInterval(i);
  }, []);

  const actualizar = useCallback((key: string, cambios: Partial<Item> | ((it: Item) => Partial<Item>)) => {
    setItems((lista) => lista.map((it) => (it.key === key ? { ...it, ...(typeof cambios === 'function' ? cambios(it) : cambios) } : it)));
  }, []);

  const procesar = useCallback(
    async (item: Item, contraseña: string | null) => {
      if (!item.file) return;
      enCurso.current.add(item.key);
      actualizar(item.key, { estado: 'subiendo', progreso: 0, codigo: null });
      try {
        actualizar(item.key, { inicio: Date.now(), etapa: null });
        let { status, json } = await subir(item.file, contraseña, (pct) => actualizar(item.key, { progreso: pct }), () => actualizar(item.key, { estado: 'leyendo' }));
        if (status === 202 && json?.importacion?.estado === 'procesando') {
          // La API respondió de inmediato; la lectura sigue en el servidor y aquí se consulta hasta que termine.
          actualizar(item.key, { estado: 'leyendo', importacion: json.importacion, etapa: json.importacion.etapa ?? 'subido' });
          ({ status, json } = await esperar(json.importacion.id, (imp) => actualizar(item.key, { etapa: imp.etapa ?? null })));
        }
        if (!json) {
          actualizar(item.key, { estado: 'error', codigo: status === 401 || status === 200 ? 'sesion_expirada' : status === 413 ? 'muy_grande' : 'servidor' });
          return;
        }
        const imp = json.importacion ?? null;
        if (status === 409 || json.codigo === 'ya_subido') {
          actualizar(item.key, { estado: 'error', codigo: 'ya_subido', importacion: imp });
          return;
        }
        if (imp?.estado === 'revisar') {
          setAjustes((a) => ({ ...a, [item.key]: a[item.key] ?? ajusteDe(imp, bancoSugerido) }));
          actualizar(item.key, { estado: 'revisar', importacion: imp, codigo: null });
          return;
        }
        if (imp?.estado === 'necesita_contraseña' || json.codigo === 'necesita_contraseña' || json.codigo === 'contraseña_incorrecta') {
          actualizar(item.key, (it) => {
            const intentos = contraseña ? it.intentos + 1 : it.intentos;
            return intentos >= 3 ? { estado: 'error', codigo: 'contraseña_agotada', importacion: imp, intentos } : { estado: 'contraseña', codigo: contraseña ? 'contraseña_incorrecta' : 'necesita_contraseña', importacion: imp, intentos };
          });
          return;
        }
        actualizar(item.key, { estado: 'error', codigo: json.codigo ?? imp?.error ?? 'servidor', importacion: imp });
      } catch (e) {
        actualizar(item.key, { estado: 'error', codigo: e instanceof Error && e.message === 'sin_conexion' ? 'sin_conexion' : 'servidor' });
      } finally {
        enCurso.current.delete(item.key);
      }
    },
    [actualizar, bancoSugerido],
  );

  // Cola: máximo 3 archivos a la vez; el resto espera.
  useEffect(() => {
    const activos = items.filter((i) => i.estado === 'subiendo' || i.estado === 'leyendo').length;
    const libres = PARALELO - activos;
    if (libres <= 0) return;
    for (const it of items.filter((i) => i.estado === 'en_cola' && i.file && !enCurso.current.has(i.key)).slice(0, libres)) void procesar(it, null);
  }, [items, procesar]);

  const agregar = (lista: FileList | File[]) => {
    setAviso(null);
    const nuevos: Item[] = [];
    let rechazados: string | null = null;
    for (const f of Array.from(lista)) {
      if (items.length + nuevos.length >= MAX_ARCHIVOS) {
        rechazados = textoError('demasiados');
        break;
      }
      if (!EXT_OK.test(f.name)) {
        nuevos.push({ key: nuevaKey(), nombre: f.name, tamano: f.size, file: null, estado: 'error', progreso: 0, codigo: 'no_pdf', importacion: null, intentos: 0 });
        continue;
      }
      if (f.size > MAX_BYTES) {
        nuevos.push({ key: nuevaKey(), nombre: f.name, tamano: f.size, file: null, estado: 'error', progreso: 0, codigo: 'muy_grande', importacion: null, intentos: 0 });
        continue;
      }
      nuevos.push({ key: nuevaKey(), nombre: f.name, tamano: f.size, file: f, estado: 'en_cola', progreso: 0, codigo: null, importacion: null, intentos: 0 });
    }
    if (rechazados) setAviso(rechazados);
    if (nuevos.length) setItems((l) => [...l, ...nuevos]);
    if (inputRef.current) inputRef.current.value = '';
  };

  const quitar = async (item: Item) => {
    setItems((l) => l.filter((i) => i.key !== item.key));
    if (item.importacion && item.importacion.estado !== 'confirmado') await fetch(`/api/imports/${item.importacion.id}`, { method: 'DELETE' }).catch(() => undefined);
  };

  const reintentar = (item: Item) => {
    if (!item.file) return;
    actualizar(item.key, { estado: 'en_cola', codigo: null, intentos: item.codigo === 'contraseña_agotada' ? 0 : item.intentos });
  };

  const enviarContraseña = (item: Item) => {
    const c = contraseñas[item.key]?.trim();
    if (!c || !item.file) return;
    void procesar(item, c);
  };

  const revisables = items.filter((i) => i.estado === 'revisar' && i.importacion);
  const enProceso = items.some((i) => i.estado === 'en_cola' || i.estado === 'subiendo' || i.estado === 'leyendo');
  const primeroBanco = revisables[0] ? infoBanco(ajustes[revisables[0].key]?.institucion || revisables[0].importacion!.resumen.institucion || 'Banco') : null;

  const identidad = (key: string, imp: Importacion) => {
    const a = ajustes[key] ?? ajusteDe(imp, bancoSugerido);
    return { banco: infoBanco(a.institucion || 'Banco').nombre, tipo: a.tipoCuenta, ultimos4: a.ultimos4 || null };
  };
  /** Cuenta existente con la misma identidad, o "hermano" si otro estado de la lista es de la misma tarjeta. */
  const destinoDe = (key: string, imp: Importacion): { cuenta: CuentaOpcion | null; hermano: boolean } => {
    const id = identidad(key, imp);
    const cuenta = cuentas.find((c) => c.banco === id.banco && c.tipo === id.tipo && (id.ultimos4 && c.ultimos4 ? c.ultimos4 === id.ultimos4 : !c.ultimos4 && !id.ultimos4)) ?? null;
    const primero = revisables.find((o) => {
      const oid = identidad(o.key, o.importacion!);
      return oid.banco === id.banco && oid.tipo === id.tipo && oid.ultimos4 === id.ultimos4;
    });
    return { cuenta, hermano: !cuenta && !!primero && primero.key !== key };
  };

  const movimientosDe = (it: Item): MovimientoNormalizado[] => ediciones[it.key] ?? it.importacion?.movimientos ?? [];
  const editarMov = (it: Item, i: number, cambios: Partial<MovimientoNormalizado>) => setEdiciones((e) => ({ ...e, [it.key]: movimientosDe(it).map((m, k) => (k === i ? { ...m, ...cambios } : m)) }));
  const quitarMov = (it: Item, i: number) => setEdiciones((e) => ({ ...e, [it.key]: movimientosDe(it).filter((_, k) => k !== i) }));

  /** Manda al servidor los cambios de la tabla de revisión. Devuelve false si no se pudo. */
  const guardarMovs = async (it: Item): Promise<boolean> => {
    const movs = ediciones[it.key];
    if (!movs || !it.importacion) return true;
    setGuardandoMovs(it.key);
    try {
      const res = await fetch(`/api/imports/${it.importacion.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ movimientos: movs }) });
      const json = (await res.json().catch(() => null)) as { importacion?: Importacion } | null;
      if (!res.ok || !json?.importacion) return false;
      actualizar(it.key, { importacion: json.importacion });
      setEdiciones((e) => { const { [it.key]: _omitido, ...resto } = e; return resto; });
      return true;
    } catch {
      return false;
    } finally {
      setGuardandoMovs(null);
    }
  };

  const confirmar = async () => {
    setConfirmando('proceso');
    setErrorConfirmar(null);
    try {
      for (const it of revisables) if (ediciones[it.key] && !(await guardarMovs(it))) throw new Error('servidor');
      const body = { items: revisables.map((i) => ({ id: i.importacion!.id, institucion: ajustes[i.key]?.institucion || null, tipoCuenta: ajustes[i.key]?.tipoCuenta || null, ultimos4: /^\d{4}$/.test(ajustes[i.key]?.ultimos4 ?? '') ? ajustes[i.key].ultimos4 : null })) };
      const res = await fetch('/api/imports/confirmar', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const json = (await res.json().catch(() => null)) as Resultado | null;
      if (!res.ok || !json) throw new Error('servidor');
      setResultado(json);
      setQuincena(json.propuestaQuincena?.esDistinta ? 'pendiente' : 'omitida');
      setItems((l) => l.filter((i) => !json.resultados.some((r) => r.ok && r.id === i.importacion?.id)));
      setConfirmando(null);
      router.refresh();
    } catch {
      setErrorConfirmar(textoError('servidor'));
      setConfirmando('error');
    }
  };

  const aceptarQuincena = async () => {
    if (!resultado?.propuestaQuincena) return;
    setQuincena('aplicando');
    const r = await aplicarDiasDePago(resultado.propuestaQuincena.dias, resultado.propuestaQuincena.ingresoQuincenal);
    setQuincena(r.ok ? 'aplicada' : 'pendiente');
  };

  const irAInicio = () => router.push(resultado?.cuentaIds[0] ? `/app?cuenta=${resultado.cuentaIds[0]}` : '/app');

  const mensajesLeyendo = TEXTOS.leyendo.mensajes;
  const tx = TEXTOS.multiple;

  // Escena "en vivo": mientras se lee, muestra el banco detectado (por el nombre del archivo) y, en cuanto hay
  // movimientos reales de cualquier archivo ya leído, los usa en lugar de la demo.
  const leyendo = items.find((i) => i.estado === 'leyendo' || i.estado === 'subiendo');
  const bancoLeyendo = leyendo ? infoBanco(leyendo.importacion?.resumen.institucion || bancoSugerido || leyendo.nombre.replace(/[_\-.]/g, ' ')) : null;
  const enVivo: MovimientoDemo[] = revisables.flatMap((i) => i.importacion!.movimientos.slice(0, 12).map((m) => ({ nombre: m.descripcion.slice(0, 26), dominio: null, monto: `${m.esAbono ? '+' : ''}${formatearCentavos(m.montoCentavos)}`, detalle: fechaCorta(m.fecha), abono: m.esAbono })));

  if (confirmando) {
    return (
      <ConectandoBanco
        banco={{ nombre: primeroBanco?.nombre || 'tu banco', dominio: primeroBanco?.dominio }}
        estado={confirmando}
        titulo={revisables.length > 1 ? `Guardando ${revisables.length} estados de cuenta` : `Guardando tu estado de cuenta`}
        pasos={['Creando tus cuentas', 'Guardando movimientos sin repetir', 'Categorizando cada compra', 'Detectando suscripciones y meses sin intereses', 'Armando tu quincena y presupuesto']}
        error={errorConfirmar}
        onCerrar={() => setConfirmando(null)}
        onListo={() => setConfirmando(null)}
        onReintentar={() => void confirmar()}
      />
    );
  }

  if (resultado) {
    const tot = resultado.totales;
    const pq = resultado.propuestaQuincena;
    const fallidos = resultado.resultados.filter((r) => !r.ok);
    return (
      <div className="mx-auto max-w-[520px] space-y-4">
        <div className="card px-6 py-8 text-center">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green text-white animate-pop"><Check size={28} strokeWidth={3} /></span>
          <h2 className="font-display text-[20px] font-bold">{TEXTOS.exito.titulo}</h2>
          <p className="mt-1.5 text-[13px] text-txt-2 dark:text-fg-2">{t(TEXTOS.exito.texto, { movimientos: pluralize(tot.movimientos, 'movimiento nuevo', 'movimientos nuevos'), cuentas: pluralize(tot.cuentas, 'cuenta'), suscripciones: pluralize(tot.suscripciones, 'suscripción', 'suscripciones'), msi: pluralize(tot.msi, 'compra a meses', 'compras a meses') })}</p>
          {tot.duplicados > 0 && <p className="mt-1 text-[12px] text-txt-2 dark:text-fg-2">{t(TEXTOS.exito.duplicados, { n: pluralize(tot.duplicados, 'movimiento') })}</p>}
          <div className="mt-5 grid grid-cols-3 gap-2">
            {[['Cuentas', tot.cuentas], ['Movimientos', tot.movimientos], ['Suscripciones', tot.suscripciones]].map(([l, v]) => (
              <div key={String(l)} className="rounded-card bg-bg-page px-2 py-3 dark:bg-surface-2">
                <div className="font-display text-[22px] font-bold leading-none">{v}</div>
                <div className="mt-1 text-[10.5px] font-semibold text-txt-2 dark:text-fg-2">{l}</div>
              </div>
            ))}
          </div>
          {fallidos.length > 0 && (
            <p className="mt-4 flex items-center gap-2 rounded-input bg-warning-soft px-3.5 py-2.5 text-left text-[12.5px] font-semibold text-fg dark:bg-surface-2"><AlertCircle size={16} className="text-warning" /> {pluralize(fallidos.length, 'archivo no se guardó', 'archivos no se guardaron')}: {fallidos.map((f) => textoError(f.codigo ?? 'servidor')).join(' ')}</p>
          )}
        </div>

        {pq && quincena !== 'omitida' && (
          <div className="card space-y-3 p-5">
            <div className="text-[14px] font-bold">{t(TEXTOS.exito.quincena_titulo, { dias: pq.dias.join(' y ') })}</div>
            <p className="text-[12.5px] text-txt-2 dark:text-fg-2">{TEXTOS.exito.quincena_texto}{pq.ingresoQuincenal > 0 ? ` Ingreso estimado por quincena: ${money(pq.ingresoQuincenal)}.` : ''}</p>
            {quincena === 'aplicada' ? (
              <p className="flex items-center gap-2 text-[12.5px] font-semibold text-green-dark dark:text-green-light"><Check size={16} /> Listo: tu quincena va del {pq.dias[0]} {pq.dias[1] ? `al ${pq.dias[1] - 1} y del ${pq.dias[1]}` : ''} en adelante.</p>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button variant="green" className="flex-1" disabled={quincena === 'aplicando'} onClick={() => void aceptarQuincena()}>{quincena === 'aplicando' ? 'Guardando…' : TEXTOS.exito.quincena_si}</Button>
                <Button variant="outline" className="flex-1" onClick={() => setQuincena('omitida')}>{t(TEXTOS.exito.quincena_no, { dias: pq.actual.join(' y ') }).replace('5 y 20', pq.actual.join(' y '))}</Button>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button variant="primary" size="lg" onClick={irAInicio}>{TEXTOS.exito.ver_inicio}</Button>
          <Button variant="outline" size="lg" onClick={() => { setResultado(null); setQuincena('pendiente'); }}>{TEXTOS.exito.subir_otro}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[680px] space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setArrastrando(true); }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(e) => { e.preventDefault(); setArrastrando(false); if (e.dataTransfer.files?.length) agregar(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        className={cn('flex cursor-pointer flex-col items-center justify-center rounded-card-xl border-2 border-dashed px-6 py-10 text-center transition-colors', arrastrando ? 'border-green bg-green-50 dark:bg-surface-2' : 'border-line-dashed bg-surface hover:bg-bg-hover dark:border-edge-2 dark:hover:bg-surface-2')}
      >
        <input ref={inputRef} type="file" multiple accept=".pdf,.csv,.txt,.xlsx,.xls,application/pdf" className="hidden" onChange={(e) => e.target.files && agregar(e.target.files)} data-testid="input-archivos" />
        <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-dark dark:bg-surface-2 dark:text-green-light"><Upload size={26} /></span>
        <div className="font-display text-[17px] font-bold">{TEXTOS.carga.titulo}</div>
        <p className="mt-1 text-[12.5px] text-txt-2 dark:text-fg-2">{TEXTOS.carga.subtitulo}</p>
        <p className="mt-0.5 hidden text-[12px] text-txt-3 md:block">{TEXTOS.carga.ayuda}</p>
        <span className="btn-primary mt-4 inline-flex h-10 items-center px-5 text-[12.5px] md:hidden">{TEXTOS.carga.boton_movil}</span>
        <span className="btn-primary mt-4 hidden h-10 items-center px-5 text-[12.5px] md:inline-flex">{TEXTOS.carga.boton}</span>
      </div>

      {aviso && <p className="flex items-center gap-2 rounded-input bg-warning-soft px-3.5 py-2.5 text-[12.5px] font-semibold text-fg dark:bg-surface-2"><AlertCircle size={16} className="text-warning" /> {aviso}</p>}

      {leyendo && (
        <section className="rounded-card-xl bg-ink p-5 text-white animate-rise md:p-7" data-testid="escena-conexion">
          <div className="mb-4 text-center">
            <div className="font-display text-[18px] font-bold tracking-[-0.3px]">Conectando {bancoLeyendo?.dominio ? bancoLeyendo.nombre : 'tu banco'}</div>
            <div className="text-[12.5px] text-white/60">{leyendo.etapa ? `${ETAPAS[leyendo.etapa] ?? tx.leyendo}…` : `${tx.subiendo}…`}</div>
          </div>
          <EscenaConexion banco={bancoLeyendo?.dominio ? { nombre: bancoLeyendo.nombre, dominio: bancoLeyendo.dominio } : null} movimientos={enVivo.length ? enVivo : MOVIMIENTOS_DEMO} ritmo={700} activa />
        </section>
      )}

      {items.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-[15px] font-bold">{tx.titulo}</h2>
            <button type="button" onClick={() => inputRef.current?.click()} className="text-[12px] font-bold text-green-dark dark:text-green-light">{tx.agregar_mas}</button>
          </div>
          <ul className="space-y-2" data-testid="lista-archivos">
            {items.map((it, idx) => {
              const imp = it.importacion;
              const info = imp?.resumen.institucion ? infoBanco(imp.resumen.institucion) : null;
              return (
                <li key={it.key} className="card px-4 py-3 animate-rise" data-estado={it.estado}>
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-bg-muted dark:bg-surface-2">
                      {it.estado === 'revisar' && info ? <Avatar domain={info.dominio} nombre={info.nombre} size={40} logoPct={60} /> : it.estado === 'contraseña' ? <Lock size={18} /> : it.estado === 'error' ? <AlertCircle size={18} className="text-warning" /> : <FileText size={18} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-bold">{it.nombre}</div>
                      <div className="text-[11.5px] text-txt-2 dark:text-fg-2">
                        {it.estado === 'en_cola' && tx.en_cola}
                        {it.estado === 'subiendo' && `${tx.subiendo} · ${it.progreso} %`}
                        {it.estado === 'leyendo' && (it.etapa ? `${ETAPAS[it.etapa] ?? tx.leyendo}…` : `${tx.leyendo}: ${mensajesLeyendo[(tick + idx) % mensajesLeyendo.length]}…`)}
                        {it.estado === 'leyendo' && it.inicio && (() => { const eta = estimarSegundos(it.tamano); const seg = Math.round((Date.now() - it.inicio) / 1000); return <span className="ml-1 text-txt-3">{seg > eta ? '· casi listo' : `· suele tardar ~${eta} s`}</span>; })()}
                        {it.estado === 'contraseña' && tx.contraseña}
                        {it.estado === 'revisar' && imp && `${tx.revisar} · ${info?.nombre ?? 'Banco'}${imp.resumen.ultimos4 ? ` ···· ${imp.resumen.ultimos4}` : ''} · ${t(TEXTOS.revision.movimientos, { n: imp.movimientos.length })}`}
                        {it.estado === 'error' && (it.codigo === 'contraseña_agotada' ? TEXTOS.contraseña.agotada : textoError(it.codigo ?? 'servidor'))}
                        {it.estado === 'error' && it.codigo === 'sesion_expirada' && <a href="/login?next=/app/importar" className="ml-1 font-bold text-green-dark dark:text-green-light">Entrar</a>}
                      </div>
                      {(it.estado === 'subiendo' || it.estado === 'leyendo') && (
                        <div className="mt-1.5 h-1 overflow-hidden rounded-pill bg-line dark:bg-surface-2">
                          <div className={cn('h-full rounded-pill bg-green transition-[width] duration-700')} style={{ width: `${it.estado === 'leyendo' ? Math.max(35, it.importacion?.progreso ?? { subido: 10, leyendo: 30, extrayendo: 60, cuadrando: 90, listo: 100 }[it.etapa ?? 'subido'] ?? 35) : it.progreso}%` }} />
                        </div>
                      )}
                    </div>
                    {it.estado === 'revisar' && <Check size={18} className="flex-none text-green-dark dark:text-green-light" />}
                    {it.estado === 'error' && it.file && it.codigo !== 'ya_subido' && (
                      <button type="button" onClick={() => reintentar(it)} className="flex h-8 items-center gap-1 rounded-pill bg-bg-muted px-3 text-[11.5px] font-bold hover:bg-line dark:bg-surface-2" aria-label={tx.reintentar}><RotateCcw size={13} /> {tx.reintentar}</button>
                    )}
                    <button type="button" onClick={() => void quitar(it)} aria-label={tx.quitar} className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-txt-3 hover:bg-bg-muted dark:hover:bg-surface-2"><X size={16} /></button>
                  </div>

                  {it.estado === 'contraseña' && (
                    <form
                      className="mt-3 space-y-2 rounded-card bg-bg-page p-3 dark:bg-surface-2"
                      onSubmit={(e) => { e.preventDefault(); enviarContraseña(it); }}
                    >
                      <div className="text-[13px] font-bold">{TEXTOS.contraseña.titulo}</div>
                      <p className="text-[12px] text-txt-2 dark:text-fg-2">{TEXTOS.contraseña.texto} {TEXTOS.contraseña.porque}</p>
                      {it.codigo === 'contraseña_incorrecta' && <p className="text-[12px] font-semibold text-fg">{t(TEXTOS.contraseña.incorrecta, { intentos: 3 - it.intentos })}</p>}
                      <div className="flex gap-2">
                        <Input type="password" autoComplete="off" placeholder={TEXTOS.contraseña.campo} value={contraseñas[it.key] ?? ''} onChange={(e) => setContraseñas((c) => ({ ...c, [it.key]: e.target.value }))} className="flex-1" />
                        <Button type="submit" variant="green" disabled={!contraseñas[it.key]?.trim()}>{TEXTOS.contraseña.boton}</Button>
                      </div>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {revisables.length > 0 && (
        <section className="card space-y-4 p-5 animate-rise" data-testid="revision">
          <div>
            <h2 className="font-display text-[17px] font-bold">{revisables.length === 1 ? TEXTOS.revision.individual : t(TEXTOS.revision.combinada, { n: revisables.length })}</h2>
            <p className="mt-0.5 text-[12.5px] text-txt-2 dark:text-fg-2">{TEXTOS.revision.subtitulo}</p>
          </div>
          <ul className="space-y-3">
            {revisables.map((it) => {
              const imp = it.importacion!;
              const a = ajustes[it.key] ?? ajusteDe(imp, bancoSugerido);
              const info = infoBanco(a.institucion || 'Banco');
              const destino = destinoDe(it.key, imp);
              const r = imp.resumen;
              const esEdicion = editando === it.key;
              return (
                <li key={it.key} className="rounded-card border border-edge p-4 animate-rise">
                  <div className="flex items-start gap-3">
                    <Avatar domain={info.dominio} nombre={info.nombre} size={44} logoPct={60} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-[14px] font-bold">{info.nombre}</span>
                        {a.ultimos4 && <span className="font-display text-[12.5px] font-bold tracking-[2px]">•••• {a.ultimos4}</span>}
                        <span className="rounded-pill bg-bg-chip px-2.5 py-0.5 text-[10.5px] font-bold text-txt-2 dark:bg-surface-2 dark:text-fg-2">{TEXTOS.revision.tipo[a.tipoCuenta]}</span>
                      </div>
                      <div className="mt-1 text-[12px] text-txt-2 dark:text-fg-2">
                        {r.periodoInicio && r.periodoFin ? `${TEXTOS.revision.periodo}: ${fechaCorta(r.periodoInicio)} – ${fechaCorta(r.periodoFin)}` : 'Periodo no detectado'} · {t(TEXTOS.revision.movimientos, { n: imp.movimientos.length })}
                        {r.saldoAlCorteCentavos != null && ` · ${TEXTOS.revision.saldo_corte}: ${formatearCentavos(r.saldoAlCorteCentavos)}`}
                      </div>
                      <div className="mt-1 text-[12px] font-semibold text-green-dark dark:text-green-light">{destino.cuenta ? t(TEXTOS.revision.ya_existe, { cuenta: destino.cuenta.nombre }) : destino.hermano ? TEXTOS.revision.misma_tarjeta : TEXTOS.revision.nueva}</div>
                      {imp.cuadre === 'sin_cuadre' && <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-txt-2 dark:text-fg-2"><AlertCircle size={14} className="text-warning" /> {TEXTOS.revision.sin_cuadre}</p>}
                      {imp.advertencias.filter((x) => x !== 'sin_cuadre').map((x) => (
                        <p key={x} className="mt-1 flex items-center gap-1.5 text-[12px] text-txt-2 dark:text-fg-2"><AlertCircle size={14} className="text-warning" /> {textoError(x) === textoError('servidor') && !(TEXTOS.errores as Record<string, string>)[x] ? x : textoError(x)}</p>
                      ))}
                    </div>
                    <button type="button" onClick={() => setEditando(esEdicion ? null : it.key)} aria-label="Editar" className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-txt-3 hover:bg-bg-muted dark:hover:bg-surface-2"><Pencil size={15} /></button>
                    <button type="button" onClick={() => void quitar(it)} aria-label={TEXTOS.revision.quitar} className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-txt-3 hover:bg-bg-muted dark:hover:bg-surface-2"><X size={16} /></button>
                  </div>
                  {esEdicion && (
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      <Input label="Banco" value={a.institucion} onChange={(e) => setAjustes((s) => ({ ...s, [it.key]: { ...a, institucion: e.target.value } }))} placeholder="BBVA, Nu, Amex…" />
                      <label className="block">
                        <span className="mb-1.5 block text-[12.5px] font-semibold">Tipo</span>
                        <select value={a.tipoCuenta} onChange={(e) => setAjustes((s) => ({ ...s, [it.key]: { ...a, tipoCuenta: e.target.value as TipoCuentaEstado } }))} className="input text-[13.5px]">
                          <option value="credito">Crédito</option>
                          <option value="debito">Débito</option>
                          <option value="inversion">Inversión</option>
                        </select>
                      </label>
                      <Input label="Últimos 4 dígitos" inputMode="numeric" value={a.ultimos4} onChange={(e) => setAjustes((s) => ({ ...s, [it.key]: { ...a, ultimos4: e.target.value.replace(/\D/g, '').slice(0, 4) } }))} placeholder="1234" />
                    </div>
                  )}
                  {movimientosDe(it).length > 0 && (
                    <details className="mt-3" open={editandoMovs === it.key}>
                      <summary className="flex cursor-pointer list-none items-center gap-1 text-[12px] font-bold text-green-dark dark:text-green-light"><ChevronRight size={14} /> Ver movimientos ({movimientosDe(it).length})</summary>
                      <div className="mt-2 flex items-center justify-between gap-2 text-[11.5px] text-txt-2 dark:text-fg-2">
                        <span>{editandoMovs === it.key ? 'Corrige lo que haga falta. Los cambios se guardan al confirmar.' : 'Si algo no coincide con tu estado de cuenta, corrígelo aquí.'}</span>
                        <button type="button" onClick={() => setEditandoMovs(editandoMovs === it.key ? null : it.key)} className="flex-none font-bold text-green-dark dark:text-green-light">{editandoMovs === it.key ? 'Terminar' : 'Editar'}</button>
                      </div>
                      <ul className="mt-2 max-h-[320px] divide-y divide-edge overflow-y-auto rounded-card border border-edge" data-testid="tabla-movimientos">
                        {movimientosDe(it).map((m, i) => (
                          <li key={i} className="flex items-center gap-2 px-3 py-2 text-[12.5px]">
                            {editandoMovs === it.key ? (
                              <>
                                <input type="date" value={m.fecha} onChange={(e) => editarMov(it, i, { fecha: e.target.value })} aria-label="Fecha" className="input h-8 w-[130px] flex-none px-2 py-0 text-[12px]" />
                                <input value={m.descripcion} onChange={(e) => editarMov(it, i, { descripcion: e.target.value })} aria-label="Descripción" className="input h-8 min-w-0 flex-1 px-2 py-0 text-[12px]" />
                                <button type="button" onClick={() => editarMov(it, i, { esAbono: !m.esAbono })} aria-label={m.esAbono ? 'Abono, cambiar a cargo' : 'Cargo, cambiar a abono'} className={cn('h-8 flex-none rounded-pill px-2.5 text-[11px] font-bold', m.esAbono ? 'bg-green-50 text-green-dark dark:text-green-light dark:bg-surface-2' : 'bg-bg-chip text-txt-2 dark:bg-surface-2')}>{m.esAbono ? 'Abono' : 'Cargo'}</button>
                                <input type="number" inputMode="decimal" min={0} step="0.01" value={(m.montoCentavos / 100).toFixed(2)} onChange={(e) => editarMov(it, i, { montoCentavos: Math.max(0, Math.round(Number(e.target.value || 0) * 100)) })} aria-label="Monto" className="input h-8 w-[104px] flex-none px-2 py-0 text-right font-display text-[12px] font-bold" />
                                <button type="button" onClick={() => quitarMov(it, i)} aria-label="Quitar movimiento" className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-txt-3 hover:bg-bg-muted dark:hover:bg-surface-2"><Trash2 size={14} /></button>
                              </>
                            ) : (
                              <>
                                <span className="w-12 flex-none text-txt-2 dark:text-fg-2">{fechaCorta(m.fecha)}</span>
                                <span className="min-w-0 flex-1 truncate">{m.descripcion}{m.msi ? ` · ${m.msi.cuota}/${m.msi.total} MSI` : ''}</span>
                                <span className={cn('font-display font-bold', m.esAbono ? 'text-green-dark dark:text-green-light' : '')}>{m.esAbono ? '+' : ''}{formatearCentavos(m.montoCentavos)}</span>
                              </>
                            )}
                          </li>
                        ))}
                      </ul>
                      {ediciones[it.key] && (
                        <div className="mt-2 flex items-center justify-between gap-2 text-[11.5px]">
                          <span className="text-txt-2 dark:text-fg-2">{ediciones[it.key].length} movimientos · cambios sin guardar</span>
                          <button type="button" disabled={guardandoMovs === it.key} onClick={() => void guardarMovs(it)} className="font-bold text-green-dark dark:text-green-light disabled:opacity-60">{guardandoMovs === it.key ? 'Guardando…' : 'Guardar cambios'}</button>
                        </div>
                      )}
                    </details>
                  )}
                </li>
              );
            })}
          </ul>
          <Button variant="green" size="lg" full disabled={enProceso || revisables.some((i) => !(ajustes[i.key]?.institucion ?? i.importacion!.resumen.institucion))} onClick={() => void confirmar()} data-testid="confirmar">
            {enProceso ? 'Esperando a que terminen de leerse…' : revisables.length === 1 ? TEXTOS.revision.confirmar_uno : t(TEXTOS.revision.confirmar_todo, { n: revisables.length })}
          </Button>
        </section>
      )}

      <p className="text-center text-[11px] text-txt-3">{TEXTOS.confianza.no_guardamos_pdf} {TEXTOS.confianza.solo_lectura}</p>
    </div>
  );
}
