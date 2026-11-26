import type { Importacion } from '@/lib/domain/tipos';

// Protocolo de la API de importación, el mismo que usa Importar (src/components/importar/Importar.tsx):
// POST /api/imports (multipart `archivo`) → 202 con la importación en `procesando` → GET /api/imports/[id] cada 1.5 s
// hasta que deja de procesar. Mismas extensiones y mismo tope de tamaño que Importar.

export const MAX_BYTES = 10 * 1024 * 1024;
export const EXT_OK = /\.(pdf|csv|txt|xlsx|xls|docx)$/i;
export const ACEPTA = '.pdf,.csv,.txt,.xlsx,.xls,.docx,application/pdf';
export const ETAPAS: Record<string, string> = { subido: 'Recibido', leyendo: 'Leyendo el documento', extrayendo: 'Detectando banco, tarjeta, periodo y movimientos', cuadrando: 'Cuadrando totales', listo: 'Listo' };
export const PROGRESO_ETAPA: Record<string, number> = { subido: 10, leyendo: 30, extrayendo: 60, cuadrando: 90, listo: 100 };

const INTERVALO_CONSULTA = 1500;
const MAX_ESPERA_MS = 300_000;

export type Respuesta = { status: number; json: { importacion?: Importacion; codigo?: string } | null };

/** Segundos que suele tardar la lectura según el tamaño (≈ 70 KB por página; el modelo tarda ~2.5 s por página). */
export function estimarSegundos(bytes: number): number {
  const paginas = Math.max(1, Math.round(bytes / 70_000));
  return Math.min(90, 6 + Math.round(paginas * 2.5));
}

/** Sube el archivo con XHR para tener el progreso de subida. */
export function subir(file: File, onProgreso: (pct: number) => void, onLeyendo: () => void): Promise<Respuesta> {
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
    xhr.send(fd);
  });
}

/** Consulta la importación hasta que deje de estar `procesando`. Avisa cada cambio de etapa o de progreso. */
export async function esperar(id: string, onAvance: (imp: Importacion) => void, cancelado: () => boolean = () => false): Promise<Respuesta> {
  const inicio = Date.now();
  let ultimo: string | null = null;
  while (Date.now() - inicio < MAX_ESPERA_MS) {
    await new Promise((r) => setTimeout(r, INTERVALO_CONSULTA));
    if (cancelado()) return { status: 499, json: null };
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
    const clave = `${imp.etapa ?? ''}:${imp.progreso ?? ''}`;
    if (clave !== ultimo) {
      ultimo = clave;
      onAvance(imp);
    }
  }
  return { status: 504, json: { codigo: 'servidor' } };
}

export type Desenlace =
  | { tipo: 'revisar'; importacion: Importacion }
  | { tipo: 'contraseña'; importacion: Importacion | null }
  | { tipo: 'ya_subido'; importacion: Importacion | null }
  | { tipo: 'error'; codigo: string };

/** Traduce la respuesta final de la API al mismo desenlace que muestra Importar. */
export function desenlaceDe({ status, json }: Respuesta): Desenlace {
  if (!json) return { tipo: 'error', codigo: status === 401 || status === 200 ? 'sesion_expirada' : status === 413 ? 'muy_grande' : 'servidor' };
  const imp = json.importacion ?? null;
  if (status === 409 || json.codigo === 'ya_subido') return { tipo: 'ya_subido', importacion: imp };
  if (imp?.estado === 'revisar') return { tipo: 'revisar', importacion: imp };
  if (imp?.estado === 'necesita_contraseña' || json.codigo === 'necesita_contraseña' || json.codigo === 'contraseña_incorrecta') return { tipo: 'contraseña', importacion: imp };
  return { tipo: 'error', codigo: json.codigo ?? imp?.error ?? 'servidor' };
}
