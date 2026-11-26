'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowUp, CalendarClock, Check, ChevronRight, FileText, FileUp, Loader2, Lock, Paperclip, Repeat, RotateCcw, Upload, Wallet } from 'lucide-react';
import { formatMXN, fechaCorta, pluralize } from '@/lib/format';
import { formatearCentavos } from '@/lib/domain/money';
import { infoBanco } from '@/lib/domain/comercios';
import type { Importacion } from '@/lib/domain/tipos';
import type { ResultadoConfirmacion } from '@/lib/services/importacion';
import { TEXTOS, textoError } from '@/lib/textos';
import { PLANES } from '@/lib/flags';
import { cn } from '@/lib/cn';
import { dejarArchivosPendientes } from '@/lib/archivosPendientes';
import { preguntarABilly } from '@/app/app/billy/acciones';
import { aplicarDiasDePago } from '@/app/app/acciones';
import { Avatar } from '@/components/ui/Avatar';
import { EjemplosRapidos } from '@/components/importar/EjemplosRapidos';
import { BillyMarca } from './BillyMarca';
import { partirCifras } from './cifras';
import { ACEPTA, ETAPAS, EXT_OK, MAX_BYTES, PROGRESO_ETAPA, desenlaceDe, esperar, estimarSegundos, subir } from './subirEstado';
import estilos from './billy.module.css';

export type ResumenBilly = { teQueda: number; diasRestantes: number; periodoActual: boolean; periodo: string; totalSuscripciones: number; nSuscripciones: number; totalProximosCobros: number; nCobros: number };

type EstadoLectura = 'subiendo' | 'leyendo' | 'revisar' | 'guardando' | 'guardado';
type Lectura = { estado: EstadoLectura; progreso: number; etapa: string | null; inicio: number; importacion: Importacion | null; totales: ResultadoConfirmacion['totales'] | null; errorGuardar: string | null };
type Accion = { etiqueta: string; tipo: 'importar' | 'reintentar' | 'enlace' | 'preguntar'; archivo?: File; href?: string; pregunta?: string };
type Quincena = { dias: number[]; ingreso: number; actual: number[]; estado: 'pendiente' | 'aplicando' | 'aplicada' | 'omitida' };

type Mensaje =
  | { id: string; de: 'yo'; tipo: 'texto'; texto: string }
  | { id: string; de: 'yo'; tipo: 'archivo'; nombre: string; tamano: number }
  | { id: string; de: 'billy'; tipo: 'texto'; texto: string; etiqueta?: string; acciones?: Accion[] }
  | { id: string; de: 'billy'; tipo: 'lectura'; archivo: File; lectura: Lectura }
  | { id: string; de: 'billy'; tipo: 'quincena'; quincena: Quincena };

const SUGERENCIAS = ['¿Cuánto me queda?', '¿Cuánto pago de suscripciones?', '¿Qué cobros vienen esta semana?'];
const MAX_ARCHIVOS = 10;
const ERRORES_REINTENTABLES = new Set(['servidor', 'sin_conexion', 'limite_api', 'lectura_no_disponible']);

let contador = 0;
const nuevoId = () => `m${Date.now().toString(36)}${(++contador).toString(36)}`;

function tamanoLegible(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function extension(nombre: string): string {
  return (/\.([a-z0-9]+)$/i.exec(nombre)?.[1] ?? 'archivo').toUpperCase();
}

/**
 * Chat con Billy. Contesta con las cifras de Presupuesto y Suscripciones (las filtra el servidor) y lee estados de
 * cuenta ahí mismo: el clip o soltar el archivo lo sube con la misma API que Importar, y al guardarlo Billy contesta
 * solo "¿cuánto me queda?" con las cifras nuevas.
 */
export function Billy({ saludo, hayDatos = true, resumen = null, preguntaInicial }: { saludo: string; hayDatos?: boolean; resumen?: ResumenBilly | null; preguntaInicial?: string }) {
  const [mensajes, setMensajes] = useState<Mensaje[]>([{ id: 'saludo', de: 'billy', tipo: 'texto', texto: saludo }]);
  const [texto, setTexto] = useState('');
  const [pensando, setPensando] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);
  const arrastre = useRef(0);
  const lista = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLTextAreaElement>(null);
  const selector = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const agregar = useCallback((...nuevos: Mensaje[]) => setMensajes((m) => [...m, ...nuevos]), []);
  const actualizarLectura = useCallback((id: string, cambios: Partial<Lectura>) => {
    setMensajes((m) => m.map((x) => (x.id === id && x.tipo === 'lectura' ? { ...x, lectura: { ...x.lectura, ...cambios } } : x)));
  }, []);
  const quitarMensaje = useCallback((id: string) => setMensajes((m) => m.filter((x) => x.id !== id)), []);

  // Baja al último mensaje cuando llega uno nuevo o cambia el estado de una lectura (no en cada punto de progreso).
  // Mientras sigas abajo, también acompaña los cambios de alto (aparecen las sugerencias, carga un logo); si subiste
  // a releer algo, no te mueve.
  const huella = `${mensajes.length}:${pensando}:${mensajes.map((m) => (m.tipo === 'lectura' ? m.lectura.estado : '')).join('')}`;
  const conversando = mensajes.length > 1 || pensando;
  const pegado = useRef(true);
  const bajadoEn = useRef(0);
  const bajar = useCallback(() => {
    bajadoEn.current = Date.now();
    const behavior: ScrollBehavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    const el = lista.current;
    // En computadora la conversación tiene su propio scroll; en el teléfono se mueve la página.
    if (el && getComputedStyle(el).overflowY === 'auto') el.scrollTo({ top: el.scrollHeight, behavior });
    else window.scrollTo({ top: document.documentElement.scrollHeight, behavior });
  }, []);
  useEffect(() => {
    if (!conversando) return;
    pegado.current = true;
    bajar();
  }, [huella, conversando, bajar]);
  useEffect(() => {
    const el = lista.current;
    if (!el || !conversando || typeof ResizeObserver === 'undefined') return;
    const alMover = () => {
      pegado.current = getComputedStyle(el).overflowY === 'auto' ? el.scrollHeight - el.scrollTop - el.clientHeight < 96 : document.documentElement.scrollHeight - window.scrollY - window.innerHeight < 96;
    };
    // Durante un desplazamiento suave los eventos intermedios aún no están abajo: también cuenta si acabamos de bajar.
    const ro = new ResizeObserver(() => (pegado.current || Date.now() - bajadoEn.current < 1200) && bajar());
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    el.addEventListener('scroll', alMover, { passive: true });
    window.addEventListener('scroll', alMover, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener('scroll', alMover);
      window.removeEventListener('scroll', alMover);
    };
  }, [conversando, bajar]);

  const preguntar = useCallback(
    async (pregunta: string, opciones: { mostrar?: boolean; etiqueta?: string } = {}) => {
      const p = pregunta.trim();
      if (!p) return;
      if (opciones.mostrar !== false) agregar({ id: nuevoId(), de: 'yo', tipo: 'texto', texto: p });
      setPensando(true);
      const r = await preguntarABilly(p).catch(() => ({ texto: 'No pude contestar. Revisa tu conexión e intenta de nuevo.' }));
      setPensando(false);
      agregar({ id: nuevoId(), de: 'billy', tipo: 'texto', texto: r.texto, etiqueta: opciones.etiqueta });
    },
    [agregar],
  );

  const enviar = (pregunta: string) => {
    if (!pregunta.trim() || pensando) return;
    setTexto('');
    if (campo.current) campo.current.style.height = '';
    void preguntar(pregunta);
  };

  // Pregunta que llega desde Inicio (?p=): se hace sola una vez al abrir.
  const preguntada = useRef(false);
  useEffect(() => {
    if (!preguntaInicial || preguntada.current) return;
    preguntada.current = true;
    void preguntar(preguntaInicial);
  }, [preguntaInicial, preguntar]);

  /** Sube y lee un archivo; la tarjeta de Billy sigue cada etapa y termina en "lo que encontré" o en un error claro. */
  const leer = useCallback(
    async (id: string, archivo: File) => {
      try {
        let r = await subir(archivo, (pct) => actualizarLectura(id, { progreso: pct }), () => actualizarLectura(id, { estado: 'leyendo', etapa: 'subido' }));
        if (r.status === 202 && r.json?.importacion?.estado === 'procesando') {
          // La API respondió de inmediato; la lectura sigue en el servidor y aquí se consulta hasta que termine.
          const imp = r.json.importacion;
          actualizarLectura(id, { estado: 'leyendo', importacion: imp, etapa: imp.etapa ?? 'subido' });
          r = await esperar(imp.id, (x) => actualizarLectura(id, { etapa: x.etapa ?? null, importacion: x }));
        }
        const d = desenlaceDe(r);
        if (d.tipo === 'revisar') {
          actualizarLectura(id, { estado: 'revisar', importacion: d.importacion, etapa: 'listo' });
          return;
        }
        quitarMensaje(id);
        if (d.tipo === 'ya_subido') {
          agregar({ id: nuevoId(), de: 'billy', tipo: 'texto', texto: `${textoError('ya_subido')} No lo vuelvo a sumar para no repetir movimientos.`, acciones: hayDatos ? [{ etiqueta: '¿Cuánto me queda?', tipo: 'preguntar', pregunta: '¿Cuánto me queda?' }] : undefined });
        } else if (d.tipo === 'contraseña') {
          agregar({ id: nuevoId(), de: 'billy', tipo: 'texto', texto: `${TEXTOS.contraseña.titulo}. ${TEXTOS.contraseña.texto} Ábrelo en Importar y la escribes ahí; ${TEXTOS.contraseña.porque.charAt(0).toLowerCase()}${TEXTOS.contraseña.porque.slice(1)}`, acciones: [{ etiqueta: 'Abrir en Importar', tipo: 'importar', archivo }] });
        } else {
          const acciones: Accion[] = [];
          if (d.codigo === 'sesion_expirada') acciones.push({ etiqueta: 'Entrar', tipo: 'enlace', href: '/login?next=/app/billy' });
          else if (d.codigo === 'limite_plan' && PLANES) acciones.push({ etiqueta: 'Ver Plus', tipo: 'enlace', href: '/app/planes' });
          else if (ERRORES_REINTENTABLES.has(d.codigo)) acciones.push({ etiqueta: 'Intentar de nuevo', tipo: 'reintentar', archivo }, { etiqueta: 'Abrir en Importar', tipo: 'importar', archivo });
          agregar({ id: nuevoId(), de: 'billy', tipo: 'texto', texto: textoError(d.codigo), acciones });
        }
      } catch (e) {
        quitarMensaje(id);
        const codigo = e instanceof Error && e.message === 'sin_conexion' ? 'sin_conexion' : 'servidor';
        agregar({ id: nuevoId(), de: 'billy', tipo: 'texto', texto: textoError(codigo), acciones: [{ etiqueta: 'Intentar de nuevo', tipo: 'reintentar', archivo }] });
      }
    },
    [actualizarLectura, agregar, quitarMensaje, hayDatos],
  );

  const empezarLectura = useCallback(
    (archivo: File) => {
      const id = nuevoId();
      agregar({ id, de: 'billy', tipo: 'lectura', archivo, lectura: { estado: 'subiendo', progreso: 0, etapa: null, inicio: Date.now(), importacion: null, totales: null, errorGuardar: null } });
      void leer(id, archivo);
    },
    [agregar, leer],
  );

  /** Archivos del clip, de soltar sobre el chat o de los ejemplos. Mismas reglas que Importar. */
  const recibir = useCallback(
    (archivos: FileList | File[]) => {
      const todos = Array.from(archivos);
      if (!todos.length) return;
      for (const archivo of todos.slice(0, MAX_ARCHIVOS)) {
        agregar({ id: nuevoId(), de: 'yo', tipo: 'archivo', nombre: archivo.name, tamano: archivo.size });
        if (!EXT_OK.test(archivo.name)) agregar({ id: nuevoId(), de: 'billy', tipo: 'texto', texto: textoError('no_pdf') });
        else if (archivo.size > MAX_BYTES) agregar({ id: nuevoId(), de: 'billy', tipo: 'texto', texto: textoError('muy_grande') });
        else empezarLectura(archivo);
      }
      if (todos.length > MAX_ARCHIVOS) agregar({ id: nuevoId(), de: 'billy', tipo: 'texto', texto: textoError('demasiados') });
      if (selector.current) selector.current.value = '';
    },
    [agregar, empezarLectura],
  );

  const abrirEnImportar = (archivo?: File) => {
    // El archivo viaja en memoria a Importar (igual que desde el onboarding) y ahí se pide la contraseña.
    if (archivo) dejarArchivosPendientes([archivo]);
    router.push('/app/importar');
  };

  /** Guarda lo leído con la misma confirmación que Importar y pregunta solo "¿cuánto me queda?" con las cifras nuevas. */
  const guardar = async (id: string, imp: Importacion) => {
    actualizarLectura(id, { estado: 'guardando', errorGuardar: null });
    try {
      // Si el archivo no dijo el banco o el tipo, se usa el mismo respaldo que propone Importar.
      const item: Record<string, string> = { id: imp.id };
      if (!imp.resumen.institucion) item.institucion = 'Mi banco';
      if (!imp.resumen.tipoCuenta) item.tipoCuenta = imp.metodo === 'tabla' ? 'debito' : 'credito';
      const res = await fetch('/api/imports/confirmar', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ items: [item] }) });
      const json = (await res.json().catch(() => null)) as ResultadoConfirmacion | null;
      const resultado = json?.resultados.find((x) => x.id === imp.id);
      if (!res.ok || !json || !resultado?.ok) {
        actualizarLectura(id, { estado: 'revisar', errorGuardar: textoError(resultado?.codigo ?? 'servidor') });
        return;
      }
      actualizarLectura(id, { estado: 'guardado', totales: json.totales });
      router.refresh();
      const t = json.totales;
      const extras = [t.suscripciones > 0 ? pluralize(t.suscripciones, 'suscripción', 'suscripciones') : null, t.msi > 0 ? pluralize(t.msi, 'compra a meses', 'compras a meses') : null].filter(Boolean);
      agregar({ id: nuevoId(), de: 'billy', tipo: 'texto', texto: `Listo, ya está en tu cuenta: ${pluralize(t.movimientos, 'movimiento nuevo', 'movimientos nuevos')}${extras.length ? ` y detecté ${extras.join(' y ')}` : ''}.${t.duplicados > 0 ? ` ${pluralize(t.duplicados, 'movimiento', 'movimientos')} ya estaban y no los repetí.` : ''}` });
      await preguntar('¿Cuánto me queda?', { mostrar: false, etiqueta: 'Con tus cifras nuevas' });
      const pq = json.propuestaQuincena;
      if (pq?.esDistinta) agregar({ id: nuevoId(), de: 'billy', tipo: 'quincena', quincena: { dias: pq.dias, ingreso: pq.ingresoQuincenal, actual: pq.actual, estado: 'pendiente' } });
    } catch {
      actualizarLectura(id, { estado: 'revisar', errorGuardar: textoError('sin_conexion') });
    }
  };

  const responderQuincena = async (id: string, q: Quincena, usar: boolean) => {
    const poner = (estado: Quincena['estado']) => setMensajes((m) => m.map((x) => (x.id === id && x.tipo === 'quincena' ? { ...x, quincena: { ...x.quincena, estado } } : x)));
    if (!usar) {
      poner('omitida');
      return;
    }
    poner('aplicando');
    const r = await aplicarDiasDePago(q.dias, q.ingreso).catch(() => ({ ok: false }));
    if (!r.ok) {
      poner('pendiente');
      return;
    }
    poner('aplicada');
    router.refresh();
    await preguntar('¿Cuánto me queda?', { mostrar: false, etiqueta: 'Con tu nueva quincena' });
  };

  const ejecutar = (a: Accion) => {
    if (a.tipo === 'importar') abrirEnImportar(a.archivo);
    else if (a.tipo === 'reintentar' && a.archivo) empezarLectura(a.archivo);
    else if (a.tipo === 'preguntar' && a.pregunta) enviar(a.pregunta);
  };

  // Soltar archivos sobre el chat. El contador evita el parpadeo al pasar sobre los hijos.
  const alEntrar = (e: React.DragEvent) => {
    if (!Array.from(e.dataTransfer.types).includes('Files')) return;
    e.preventDefault();
    arrastre.current += 1;
    setArrastrando(true);
  };
  const alSalir = () => {
    arrastre.current = Math.max(0, arrastre.current - 1);
    if (arrastre.current === 0) setArrastrando(false);
  };
  const alSoltar = (e: React.DragEvent) => {
    e.preventDefault();
    arrastre.current = 0;
    setArrastrando(false);
    if (e.dataTransfer.files?.length) recibir(e.dataTransfer.files);
  };

  const leyendoAlgo = mensajes.some((m) => m.tipo === 'lectura');
  const bienvenida = !hayDatos && !leyendoAlgo && mensajes.length === 1;

  return (
    <div className="mx-auto grid max-w-[1120px] gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
      <section
        aria-label="Chat con Billy"
        onDragEnter={alEntrar}
        onDragOver={(e) => Array.from(e.dataTransfer.types).includes('Files') && e.preventDefault()}
        onDragLeave={alSalir}
        onDrop={alSoltar}
        className={cn(
          // Teléfono: ocupa la pantalla y se come el relleno inferior del layout; el compositor se pega abajo, sobre la barra flotante.
          'relative flex min-h-[calc(100dvh-60px)] min-w-0 flex-col -mb-[120px]',
          // Computadora: una tarjeta del alto de la pantalla con su propio scroll.
          'md:mb-0 md:h-[calc(100dvh-140px)] md:min-h-[560px] md:overflow-hidden md:rounded-card-xl md:bg-surface md:shadow-card',
        )}
      >
        <header className="flex items-center gap-3 pb-3 pt-1 md:border-b md:border-edge md:px-6 md:py-4">
          <BillyMarca size={44} className="hidden md:inline-flex" />
          <BillyMarca size={34} className="md:hidden" />
          <div className="min-w-0 flex-1">
            {/* En el teléfono el título "Billy" ya está arriba; aquí basta el estado. */}
            <p className="hidden font-display text-[17px] font-bold leading-tight tracking-[-0.3px] md:block">Billy</p>
            <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-green-dark dark:text-green-light">
              <span className="relative flex h-2 w-2">
                <span className="absolute inset-0 rounded-full bg-green-light motion-safe:animate-pulse-ring" aria-hidden />
                <span className="relative h-2 w-2 rounded-full bg-green" aria-hidden />
              </span>
              Contesta con tus cifras
            </p>
          </div>
          <span className="flex items-center gap-1.5 rounded-pill bg-bg-muted px-3 py-1.5 text-[11.5px] font-semibold text-txt-2 dark:bg-surface-2 dark:text-fg-2"><Lock size={12} /> Privado</span>
        </header>

        <div ref={lista} className="flex flex-1 flex-col md:overflow-y-auto md:px-6 md:py-5">
          <div className="flex flex-1 flex-col gap-4 pb-6 md:pb-0" role="log" aria-live="polite" aria-label="Conversación con Billy">
            <p className="mx-auto max-w-[440px] px-4 pb-1 pt-2 text-center text-[11.5px] leading-snug text-txt-2 dark:text-fg-2">
              Billy contesta solo con las cifras de tus pantallas. No da asesoría de inversión ni guarda lo que le escribes.
            </p>
            {mensajes.map((m) => {
              if (m.de === 'yo') {
                return (
                  <div key={m.id} className="flex justify-end animate-rise">
                    {m.tipo === 'texto' ? (
                      <p className="max-w-[82%] whitespace-pre-line rounded-card-lg rounded-br-input bg-ink px-4 py-2.5 text-[14px] leading-relaxed text-white md:max-w-[520px]">{m.texto}</p>
                    ) : (
                      <div className="flex max-w-[82%] items-center gap-3 rounded-card-lg rounded-br-input bg-ink py-2.5 pl-2.5 pr-4 text-white md:max-w-[360px]">
                        <span className="flex h-10 w-10 flex-none items-center justify-center rounded-input bg-white/10 text-green-light"><FileText size={19} /></span>
                        <span className="min-w-0">
                          <span className="block truncate text-[13.5px] font-semibold">{m.nombre}</span>
                          <span className="block text-[11.5px] text-white/70">{extension(m.nombre)} · {tamanoLegible(m.tamano)}</span>
                        </span>
                      </div>
                    )}
                  </div>
                );
              }
              return (
                <FilaBilly key={m.id}>
                  {m.tipo === 'texto' && (
                    <>
                      <Burbuja etiqueta={m.etiqueta}>{m.texto}</Burbuja>
                      {m.id === 'saludo' && bienvenida && <Bienvenida onSubir={() => selector.current?.click()} onEjemplo={(f) => recibir([f])} />}
                      {!!m.acciones?.length && (
                        <div className="flex flex-wrap gap-2">
                          {m.acciones.map((a) =>
                            a.tipo === 'enlace' ? (
                              <Link key={a.etiqueta} href={a.href!} className="flex h-9 items-center rounded-pill bg-ink px-4 text-[12.5px] font-semibold text-white transition-colors hover:bg-green">{a.etiqueta}</Link>
                            ) : (
                              <button key={a.etiqueta} type="button" onClick={() => ejecutar(a)} className={cn('flex h-9 items-center gap-1.5 rounded-pill px-4 text-[12.5px] font-semibold transition-colors', a.tipo === 'reintentar' || (a.tipo === 'importar' && m.acciones!.length === 1) ? 'bg-ink text-white hover:bg-green' : 'border border-line-2 bg-surface text-fg hover:bg-bg-hover dark:border-edge')}>
                                {a.tipo === 'reintentar' && <RotateCcw size={13} />}
                                {a.etiqueta}
                              </button>
                            ),
                          )}
                        </div>
                      )}
                    </>
                  )}
                  {m.tipo === 'lectura' && <TarjetaLectura nombre={m.archivo.name} tamano={m.archivo.size} lectura={m.lectura} onGuardar={() => m.lectura.importacion && void guardar(m.id, m.lectura.importacion)} />}
                  {m.tipo === 'quincena' && <TarjetaQuincena q={m.quincena} onResponder={(usar) => void responderQuincena(m.id, m.quincena, usar)} />}
                </FilaBilly>
              );
            })}
            {pensando && (
              <FilaBilly>
                <div className="flex h-[42px] items-center gap-1.5 rounded-card-lg rounded-tl-input bg-surface px-4 text-ink shadow-card dark:text-fg md:bg-bg-muted md:shadow-none md:dark:bg-surface-2" data-testid="billy-escribiendo">
                  <span className={estilos.punto} />
                  <span className={estilos.punto} />
                  <span className={estilos.punto} />
                  <span className="sr-only">Billy está escribiendo</span>
                </div>
              </FilaBilly>
            )}
          </div>
        </div>

        {/* Compositor. Teléfono: pegado abajo, por encima de la barra flotante (66 px + 14 px del borde). */}
        <div className="sticky bottom-0 z-20 -mx-3.5 bg-canvas px-3.5 pb-[calc(max(14px,env(safe-area-inset-bottom))+78px)] pt-2 before:pointer-events-none before:absolute before:inset-x-0 before:-top-5 before:h-5 before:bg-gradient-to-t before:from-canvas before:to-transparent md:static md:mx-0 md:border-t md:border-edge md:bg-surface md:px-6 md:pb-4 md:pt-3 md:before:hidden">
          {hayDatos && (
            <div className="-mx-3.5 mb-2 flex gap-2 overflow-x-auto px-3.5 md:mx-0 md:flex-wrap md:px-0" aria-label="Preguntas sugeridas">
              {SUGERENCIAS.map((s) => (
                <button key={s} type="button" disabled={pensando} onClick={() => enviar(s)} className="shrink-0 whitespace-nowrap rounded-pill border border-line-2 bg-surface px-3.5 py-2 text-[12.5px] font-semibold text-fg transition-colors hover:border-green hover:bg-green-50 disabled:opacity-60 dark:border-edge dark:hover:bg-surface-2">
                  {s}
                </button>
              ))}
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              enviar(texto);
            }}
            className="flex items-end gap-1 rounded-card-xl border border-line-2 bg-surface p-1.5 shadow-card transition-[border-color,box-shadow] focus-within:border-green focus-within:shadow-hover dark:border-edge"
          >
            <button type="button" onClick={() => selector.current?.click()} aria-label="Adjuntar estado de cuenta" title="Adjunta tu estado de cuenta (PDF, Excel, CSV o Word)" className="flex h-10 w-10 flex-none items-center justify-center rounded-full text-txt-2 transition-colors hover:bg-bg-muted hover:text-fg dark:text-fg-2 dark:hover:bg-surface-2">
              <Paperclip size={19} />
            </button>
            <label className="sr-only" htmlFor="pregunta-billy">Tu pregunta para Billy</label>
            <textarea
              id="pregunta-billy"
              ref={campo}
              rows={1}
              value={texto}
              onChange={(e) => {
                setTexto(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  enviar(texto);
                }
              }}
              maxLength={500}
              placeholder="Pregúntale a Billy"
              autoComplete="off"
              className="max-h-[120px] min-h-[40px] flex-1 resize-none bg-transparent px-1 py-[9px] text-[14.5px] leading-[22px] text-fg placeholder:text-txt-3 focus-visible:outline-none"
            />
            <button type="submit" disabled={pensando || !texto.trim()} aria-label="Enviar pregunta" className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-ink text-white transition-colors hover:bg-green disabled:bg-line-dashed disabled:hover:bg-line-dashed dark:bg-white dark:text-ink">
              <ArrowUp size={19} strokeWidth={2.4} />
            </button>
          </form>
          <p className="mt-2 hidden text-center text-[11px] text-txt-2 dark:text-fg-2 md:block">Puedes adjuntar o soltar aquí tu estado de cuenta: PDF, Excel, CSV o Word de hasta 10 MB.</p>
          <input ref={selector} type="file" multiple accept={ACEPTA} className="hidden" aria-label="Elegir estado de cuenta" data-testid="billy-archivo" onChange={(e) => e.target.files && recibir(e.target.files)} />
        </div>

        {arrastrando && (
          <div className="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center gap-2 rounded-card-xl border-2 border-dashed border-green bg-green-50/95 text-center animate-fade dark:bg-surface/95">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-green text-white shadow-green"><Upload size={24} /></span>
            <p className="font-display text-[17px] font-bold">Suelta tu estado de cuenta</p>
            <p className="text-[12.5px] text-txt-2 dark:text-fg-2">Billy lo lee aquí mismo. PDF, Excel, CSV o Word de hasta 10 MB.</p>
          </div>
        )}
      </section>

      {resumen ? <LoQueSabe r={resumen} onSubir={() => selector.current?.click()} /> : <ComoFunciona onSubir={() => selector.current?.click()} />}
    </div>
  );
}

/** Un mensaje de Billy: su marca a la izquierda y el contenido apilado. */
function FilaBilly({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 animate-rise">
      <BillyMarca size={30} className="mt-0.5" />
      <div className="flex min-w-0 max-w-[88%] flex-1 flex-col items-start gap-2.5 md:max-w-[560px]">{children}</div>
    </div>
  );
}

/** Burbuja de Billy con los montos destacados en la tipografía de cifras. */
function Burbuja({ children, etiqueta }: { children: string; etiqueta?: string }) {
  return (
    <div className="rounded-card-lg rounded-tl-input bg-surface px-4 py-3 text-[14px] leading-relaxed text-fg shadow-card md:bg-bg-muted md:shadow-none md:dark:bg-surface-2" data-etiqueta={etiqueta}>
      {etiqueta && <span className="mb-1 block text-[10.5px] font-bold uppercase tracking-[0.8px] text-green-dark dark:text-green-light">{etiqueta}</span>}
      <p className="whitespace-pre-line">
        {partirCifras(children).map((s, i) => (s.cifra ? <b key={i} className="whitespace-nowrap font-display text-[15px] font-extrabold tracking-[-0.2px]">{s.texto}</b> : <span key={i}>{s.texto}</span>))}
      </p>
    </div>
  );
}

/** Cuenta nueva: subir el estado de cuenta ahí mismo o probar con un ejemplo de un toque. */
function Bienvenida({ onSubir, onEjemplo }: { onSubir: () => void; onEjemplo: (f: File) => void }) {
  return (
    <div className="w-full rounded-card-lg border border-edge-2 bg-surface p-4 shadow-card md:max-w-[520px] md:shadow-none">
      <button type="button" onClick={onSubir} className="btn-primary flex h-11 w-full items-center justify-center gap-2 px-5 text-[13.5px]">
        <FileUp size={17} /> Subir estado de cuenta
      </button>
      <p className="mt-2 text-center text-[11.5px] text-txt-2 dark:text-fg-2">PDF, Excel, CSV o Word de hasta 10 MB. También puedes soltarlo en el chat.</p>
      <div className="my-3.5 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.8px] text-txt-2 dark:text-fg-2">
        <span className="h-px flex-1 bg-line-2 dark:bg-edge" />o prueba con un ejemplo<span className="h-px flex-1 bg-line-2 dark:bg-edge" />
      </div>
      {/* En el chat, uno debajo del otro: en dos columnas el detalle de cada ejemplo se cortaba. */}
      <EjemplosRapidos onArchivo={onEjemplo} className="[&>div]:!grid-cols-1" />
    </div>
  );
}

/** La lectura de un estado de cuenta dentro del chat: progreso por etapa y, al terminar, lo que encontró y qué hacer. */
function TarjetaLectura({ nombre, tamano, lectura, onGuardar }: { nombre: string; tamano: number; lectura: Lectura; onGuardar: () => void }) {
  const { estado, importacion: imp } = lectura;
  const leyendo = estado === 'subiendo' || estado === 'leyendo';
  const listo = !leyendo && imp;
  const r = imp?.resumen;
  const info = r?.institucion ? infoBanco(r.institucion) : null;
  const tipo = r?.tipoCuenta ? TEXTOS.revision.tipo[r.tipoCuenta] : null;
  const pct = estado === 'subiendo' ? Math.round(lectura.progreso * 0.2) : Math.max(25, imp?.progreso ?? PROGRESO_ETAPA[lectura.etapa ?? 'subido'] ?? 25);
  const eta = estimarSegundos(tamano);
  const transcurrido = Math.round((Date.now() - lectura.inicio) / 1000);

  const intro = leyendo
    ? 'Dame un momento, estoy leyendo tu estado de cuenta.'
    : estado === 'guardado'
      ? 'Guardado. Así quedó:'
      : 'Listo, ya lo leí. Esto encontré:';

  return (
    <>
      <Burbuja>{intro}</Burbuja>
      <div className="w-full overflow-hidden rounded-card-lg border border-edge-2 bg-surface shadow-card md:w-[440px] md:shadow-none" data-testid="billy-lectura" data-estado={estado}>
        <div className="flex items-center gap-3 p-4 pb-3">
          {listo && info ? (
            <Avatar domain={info.dominio} nombre={info.nombre} size={42} logoPct={60} />
          ) : (
            <span className="flex h-[42px] w-[42px] flex-none items-center justify-center rounded-full bg-green-50 text-green-dark dark:bg-surface-2 dark:text-green-light">
              {leyendo ? <Loader2 size={19} className="motion-safe:animate-spin" /> : <FileText size={19} />}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-bold">{listo ? info?.nombre ?? 'Banco no detectado' : nombre}</p>
            <p className={cn('text-[12px] leading-snug text-txt-2 dark:text-fg-2', !leyendo && 'truncate')}>
              {leyendo
                ? `${estado === 'subiendo' ? `Subiendo · ${lectura.progreso} %` : `${ETAPAS[lectura.etapa ?? 'subido'] ?? 'Leyendo'}…`}${estado === 'leyendo' ? (transcurrido > eta ? ' · casi listo' : ` · suele tardar ~${eta} s`) : ''}`
                : [tipo, r?.ultimos4 ? `•••• ${r.ultimos4}` : null].filter(Boolean).join(' · ') || 'Revisa el banco en Importar'}
            </p>
          </div>
          {!leyendo && (
            <span className={cn('flex flex-none items-center gap-1 rounded-pill px-2.5 py-1 text-[11px] font-bold', estado === 'guardado' ? 'bg-green text-white' : 'bg-green-50 text-green-dark dark:bg-surface-2 dark:text-green-light')}>
              <Check size={12} strokeWidth={3} /> {estado === 'guardado' ? 'Guardado' : 'Leído'}
            </span>
          )}
        </div>

        {leyendo && (
          <div className="px-4">
            <div className="h-1.5 overflow-hidden rounded-pill bg-bg-muted dark:bg-surface-2" role="progressbar" aria-label="Avance de la lectura" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
              <div className={cn('h-full rounded-pill bg-green transition-[width] duration-700 ease-out', estilos.barra)} style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}

        <dl className="grid grid-cols-2 gap-2 p-4 pt-3">
          <Dato titulo="Periodo" valor={listo ? (r?.periodoInicio && r.periodoFin ? `${fechaCorta(r.periodoInicio)} – ${fechaCorta(r.periodoFin)}` : 'No detectado') : null} />
          <Dato titulo="Movimientos" valor={listo ? String(imp.movimientos.length) : null} grande />
          {(leyendo || r?.saldoAlCorteCentavos != null) && <Dato titulo={TEXTOS.revision.saldo_corte} valor={listo && r?.saldoAlCorteCentavos != null ? formatearCentavos(r.saldoAlCorteCentavos) : null} ancho />}
        </dl>

        {listo && imp.cuadre === 'sin_cuadre' && estado !== 'guardado' && (
          <p className="mx-4 -mt-1 mb-3 flex items-start gap-2 rounded-input bg-warning-soft px-3 py-2 text-[12px] text-fg dark:bg-surface-2"><AlertCircle size={15} className="mt-px flex-none text-warning" /> {TEXTOS.revision.sin_cuadre}</p>
        )}
        {lectura.errorGuardar && <p className="mx-4 -mt-1 mb-3 flex items-start gap-2 rounded-input bg-warning-soft px-3 py-2 text-[12px] font-semibold text-fg dark:bg-surface-2"><AlertCircle size={15} className="mt-px flex-none text-warning" /> {lectura.errorGuardar}</p>}

        {(estado === 'revisar' || estado === 'guardando') && (
          <div className="flex gap-2 border-t border-edge p-3">
            <button type="button" onClick={onGuardar} disabled={estado === 'guardando'} className="flex h-10 min-w-0 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-pill bg-green px-4 text-[13px] font-bold text-white transition-colors hover:bg-green-dark disabled:cursor-wait">
              {estado === 'guardando' ? <><Loader2 size={15} className="motion-safe:animate-spin" /> Guardando…</> : 'Guardar'}
            </button>
            {estado === 'revisar' && (
              <Link href="/app/importar" className="flex h-10 flex-none items-center justify-center whitespace-nowrap rounded-pill border border-line-2 bg-surface px-4 text-[13px] font-semibold text-fg transition-colors hover:bg-bg-hover dark:border-edge md:flex-1">Revisar en Importar</Link>
            )}
          </div>
        )}
        {estado === 'guardado' && lectura.totales && (
          <div className="flex items-center justify-between gap-2 border-t border-edge px-4 py-3 text-[12px] text-txt-2 dark:text-fg-2">
            <span>{pluralize(lectura.totales.movimientos, 'movimiento nuevo', 'movimientos nuevos')} · {pluralize(lectura.totales.suscripciones, 'suscripción', 'suscripciones')}</span>
            <Link href="/app" className="flex items-center gap-0.5 font-bold text-green-dark dark:text-green-light">Ver Inicio <ChevronRight size={14} /></Link>
          </div>
        )}
      </div>
    </>
  );
}

function Dato({ titulo, valor, grande, ancho }: { titulo: string; valor: string | null; grande?: boolean; ancho?: boolean }) {
  return (
    <div className={cn('rounded-card bg-bg-page px-3 py-2.5 dark:bg-surface-2', ancho && 'col-span-2')}>
      <dt className="text-[11px] font-semibold text-txt-2 dark:text-fg-2">{titulo}</dt>
      <dd className={cn('mt-0.5 font-display font-bold leading-tight tracking-[-0.2px]', grande ? 'text-[18px]' : 'text-[13.5px]')}>
        {valor ?? <span className="mt-1.5 block h-3.5 w-3/4 rounded-pill bg-[linear-gradient(90deg,#E6ECE9_25%,#F4F6F4_50%,#E6ECE9_75%)] bg-[length:200%_100%] motion-safe:animate-shimmer" aria-hidden />}
        {valor == null && <span className="sr-only">Leyendo</span>}
      </dd>
    </div>
  );
}

/** Propuesta de quincena tras guardar: los días en que de verdad llega la nómina. */
function TarjetaQuincena({ q, onResponder }: { q: Quincena; onResponder: (usar: boolean) => void }) {
  return (
    <div className="w-full rounded-card-lg border border-edge-2 bg-surface p-4 shadow-card md:w-[440px] md:shadow-none">
      <p className="text-[14px] font-bold">Vi tu nómina los días {q.dias.join(' y ')}</p>
      <p className="mt-1 text-[12.5px] leading-relaxed text-txt-2 dark:text-fg-2">{TEXTOS.exito.quincena_texto}</p>
      {q.estado === 'aplicada' ? (
        <p className="mt-3 flex items-center gap-2 text-[12.5px] font-semibold text-green-dark dark:text-green-light"><Check size={16} /> Listo: tu quincena ahora sigue tus días de pago.</p>
      ) : q.estado === 'omitida' ? (
        <p className="mt-3 text-[12.5px] font-semibold text-txt-2 dark:text-fg-2">Sigo con los días {q.actual.join(' y ')}. Lo cambias cuando quieras en Ajustes.</p>
      ) : (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <button type="button" disabled={q.estado === 'aplicando'} onClick={() => onResponder(true)} className="flex h-10 flex-1 items-center justify-center gap-2 rounded-pill bg-green px-4 text-[12.5px] font-bold text-white transition-colors hover:bg-green-dark disabled:cursor-wait">
            {q.estado === 'aplicando' ? <><Loader2 size={14} className="motion-safe:animate-spin" /> Guardando…</> : TEXTOS.exito.quincena_si}
          </button>
          <button type="button" disabled={q.estado === 'aplicando'} onClick={() => onResponder(false)} className="flex h-10 flex-1 items-center justify-center rounded-pill border border-line-2 bg-surface px-4 text-[12.5px] font-semibold text-fg hover:bg-bg-hover dark:border-edge">Dejar {q.actual.join(' y ')}</button>
        </div>
      )}
    </div>
  );
}

/** Las tres cifras con las que contesta Billy, ligadas a la pantalla de donde salen. */
function LoQueSabe({ r, onSubir }: { r: ResumenBilly; onSubir: () => void }) {
  const filas = [
    { icon: Wallet, etiqueta: r.teQueda < 0 ? 'Te pasaste' : 'Te quedan', valor: formatMXN(Math.abs(r.teQueda)), detalle: r.periodoActual ? `${r.diasRestantes === 1 ? '1 día' : `${r.diasRestantes} días`} para tu quincena` : `Último periodo con datos · ${r.periodo}`, href: '/app/presupuesto', destino: 'Presupuesto' },
    { icon: Repeat, etiqueta: 'Suscripciones al mes', valor: formatMXN(r.totalSuscripciones), detalle: r.nSuscripciones === 1 ? '1 suscripción activa' : `${r.nSuscripciones} suscripciones activas`, href: '/app/fijos', destino: 'Suscripciones' },
    { icon: CalendarClock, etiqueta: 'Cobros en 7 días', valor: formatMXN(r.totalProximosCobros), detalle: r.nCobros === 0 ? 'Sin cobros fijos esta semana' : r.nCobros === 1 ? '1 cobro programado' : `${r.nCobros} cobros programados`, href: '/app/fijos', destino: 'Suscripciones' },
  ];
  return (
    <aside className="hidden space-y-3 lg:sticky lg:top-[76px] lg:block" aria-label="Lo que sabe Billy">
      <div className="relative overflow-hidden rounded-card-xl bg-ink p-5 text-white shadow-dark dark:bg-surface-2 dark:ring-1 dark:ring-white/10">
        <span className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-green/25 blur-2xl" aria-hidden />
        <div className="relative text-[11px] font-bold uppercase tracking-[0.9px] text-green-light">Lo que sabe Billy</div>
        <p className="relative mt-1 text-[12.5px] leading-relaxed text-white/70">Contesta solo con estas cifras. Son las mismas de tus pantallas.</p>
        <ul className="relative mt-4 space-y-1">
          {filas.map((f) => {
            const Icon = f.icon;
            return (
              <li key={f.etiqueta}>
                <Link href={f.href} className="group -mx-2 flex items-center gap-3 rounded-card px-2 py-2.5 transition-colors hover:bg-white/5">
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-white/10 text-green-light"><Icon size={16} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11.5px] text-white/70">{f.etiqueta}</span>
                    <span className="block font-display text-[20px] font-bold leading-tight tracking-[-0.4px]">{f.valor}</span>
                    <span className="block truncate text-[11px] text-white/60">{f.detalle}</span>
                  </span>
                  <span className="flex items-center gap-0.5 text-[11px] font-semibold text-white/60 transition-colors group-hover:text-green-light">{f.destino}<ChevronRight size={14} /></span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
      <button type="button" onClick={onSubir} className="card flex w-full items-center gap-3 p-4 text-left transition-shadow hover:shadow-hover">
        <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-green-50 text-green-dark dark:bg-surface-2 dark:text-green-light"><FileUp size={18} /></span>
        <span className="min-w-0 flex-1">
          <b className="block text-[13.5px]">Dale otro estado de cuenta</b>
          <span className="block text-[12px] leading-snug text-txt-2 dark:text-fg-2">Billy lo lee aquí y sus cifras se actualizan.</span>
        </span>
        <Paperclip size={17} className="flex-none text-txt-3" />
      </button>
    </aside>
  );
}

/** Cuenta nueva en computadora: qué hace Billy en tres pasos, junto al chat. */
function ComoFunciona({ onSubir }: { onSubir: () => void }) {
  const pasos = [
    { titulo: 'Dale tu estado de cuenta', texto: 'Con el clip o soltándolo en el chat. PDF, Excel, CSV o Word.' },
    { titulo: 'Lo lee y te lo enseña', texto: 'Banco, tarjeta, periodo y movimientos. Tú decides si lo guardas.' },
    { titulo: 'Pregúntale lo que sea', texto: 'Cuánto te queda, qué pagas de suscripciones y qué cobros vienen.' },
  ];
  return (
    <aside className="hidden space-y-3 lg:sticky lg:top-[76px] lg:block" aria-label="Cómo funciona Billy">
      <div className="relative overflow-hidden rounded-card-xl bg-ink p-5 text-white shadow-dark dark:bg-surface-2 dark:ring-1 dark:ring-white/10">
        <span className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-green/25 blur-2xl" aria-hidden />
        <div className="relative text-[11px] font-bold uppercase tracking-[0.9px] text-green-light">Cómo funciona</div>
        <ol className="relative mt-4 space-y-4">
          {pasos.map((p, i) => (
            <li key={p.titulo} className="flex gap-3">
              <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-white/10 font-display text-[12.5px] font-bold text-green-light">{i + 1}</span>
              <span>
                <b className="block text-[13.5px]">{p.titulo}</b>
                <span className="block text-[12px] leading-snug text-white/70">{p.texto}</span>
              </span>
            </li>
          ))}
        </ol>
        <button type="button" onClick={onSubir} className="relative mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-pill bg-white text-[13px] font-bold text-ink transition-colors hover:bg-green-light">
          <Paperclip size={16} /> Elegir archivo
        </button>
      </div>
      <p className="flex items-start gap-2 px-1 text-[11.5px] leading-snug text-txt-2 dark:text-fg-2"><Lock size={13} className="mt-0.5 flex-none" /> {TEXTOS.confianza.no_guardamos_pdf}</p>
    </aside>
  );
}
