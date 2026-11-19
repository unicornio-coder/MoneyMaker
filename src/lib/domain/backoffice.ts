// Back office: lógica pura, con test. Quién puede entrar y cómo se resume qué están haciendo los usuarios.
// Nunca maneja montos ni movimientos: solo cuentas, fechas y nombres de eventos.

export type PerfilAdmin = { id: string; email: string; nombre: string | null; creado: string; onboardingCompleto: boolean };
export type EventoAdmin = { userId: string | null; nombre: string; cuando: string; sospechosa?: boolean };
export type ArchivoAdmin = { userId: string; estado: string; cuando: string };

export type FilaUsuario = {
  id: string;
  email: string;
  nombre: string | null;
  creado: string;
  onboardingCompleto: boolean;
  /** Cuenta de prueba (correos @example.com de QA): se muestra, pero no cuenta en los totales. */
  prueba: boolean;
  archivos: number;
  archivosConError: number;
  eventos: number;
  ultimaActividad: string | null;
  ultimoEvento: string | null;
};

export type ResumenBackoffice = {
  usuarios: number;
  nuevos7d: number;
  activos7d: number;
  onboarding: number;
  conArchivo: number;
  archivosConError7d: number;
  preguntasBilly7d: number;
  preguntasSospechosas7d: number;
  filas: FilaUsuario[];
  actividad: { cuando: string; nombre: string; email: string | null; prueba: boolean }[];
};

const DIA = 86_400_000;

/** Solo entran los correos de ADMIN_EMAILS (separados por coma o espacio). Sin lista, nadie. */
export function esAdmin(email: string | null | undefined, lista: string | null | undefined): boolean {
  const yo = (email ?? '').trim().toLowerCase();
  if (!yo) return false;
  return (lista ?? '')
    .split(/[\s,;]+/)
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean)
    .includes(yo);
}

export function esCuentaDePrueba(email: string): boolean {
  return /@example\.com$/i.test(email.trim());
}

const ETIQUETAS: Record<string, string> = {
  registro: 'Se registró',
  onboarding_completo: 'Terminó el onboarding',
  fuente_conectada: 'Conectó una fuente',
  importacion: 'Guardó un estado de cuenta',
  import_iniciada: 'Subió un archivo',
  import_lista: 'Archivo listo para revisar',
  import_error: 'Falló la lectura de un archivo',
  wow_visto: 'Vio cuánto puede invertir',
  suscripcion_cancelada: 'Marcó una suscripción como cancelada',
  cancelar_por_mi: 'Pidió cancelar por él',
  carta_cancelacion: 'Generó carta de cancelación',
  negociar_por_mi: 'Pidió negociar por él',
  negociacion_resultado: 'Resultado de negociación',
  presupuesto_editado: 'Editó su presupuesto',
  checkout_iniciado: 'Inició el pago',
  suscripcion_pagada: 'Pagó la suscripción',
  cuenta_borrada: 'Borró su cuenta',
  reporte_problema: 'Reportó un problema',
  correo_bienvenida: 'Correo de bienvenida enviado',
  correo_conecta: 'Correo "Falta un paso" enviado',
  billy_respuesta: 'Le preguntó a Billy',
  telegram_respuesta: 'Le preguntó a Billy por Telegram',
  telegram_vinculado: 'Vinculó Telegram',
};

/** Nombre del evento en lenguaje humano. Un evento sin etiqueta se muestra con su nombre, sin guiones bajos. */
export function etiquetaEvento(nombre: string): string {
  return ETIQUETAS[nombre] ?? nombre.replace(/_/g, ' ');
}

/** "hace 5 min", "hace 3 h", "hace 2 días"; después de 30 días, la fecha. */
export function haceCuanto(iso: string | null, ahora: Date): string {
  if (!iso) return 'Sin actividad';
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return 'Sin actividad';
  const ms = Math.max(0, ahora.getTime() - t);
  const min = Math.floor(ms / 60_000);
  if (min < 1) return 'hace un momento';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d <= 30) return d === 1 ? 'hace 1 día' : `hace ${d} días`;
  return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Mexico_City' }).format(new Date(t));
}

/** Junta perfiles, eventos y archivos en los totales y la tabla del back office. Los totales no cuentan cuentas de prueba. */
export function resumenBackoffice(args: { perfiles: PerfilAdmin[]; eventos: EventoAdmin[]; archivos: ArchivoAdmin[]; ahora: Date }): ResumenBackoffice {
  const { perfiles, eventos, archivos, ahora } = args;
  const hace7 = ahora.getTime() - 7 * DIA;
  const reciente = (iso: string | null) => !!iso && new Date(iso).getTime() >= hace7;
  const porId = new Map<string, FilaUsuario>();
  for (const p of perfiles) {
    porId.set(p.id, { id: p.id, email: p.email, nombre: p.nombre, creado: p.creado, onboardingCompleto: p.onboardingCompleto, prueba: esCuentaDePrueba(p.email), archivos: 0, archivosConError: 0, eventos: 0, ultimaActividad: null, ultimoEvento: null });
  }
  const tocar = (f: FilaUsuario, cuando: string, etiqueta: string) => {
    if (!f.ultimaActividad || cuando > f.ultimaActividad) {
      f.ultimaActividad = cuando;
      f.ultimoEvento = etiqueta;
    }
  };
  for (const a of archivos) {
    const f = porId.get(a.userId);
    if (!f) continue;
    f.archivos += 1;
    if (a.estado === 'error') f.archivosConError += 1;
    tocar(f, a.cuando, a.estado === 'error' ? 'Falló la lectura de un archivo' : 'Subió un archivo');
  }
  for (const e of eventos) {
    const f = e.userId ? porId.get(e.userId) : undefined;
    if (!f) continue;
    f.eventos += 1;
    tocar(f, e.cuando, etiquetaEvento(e.nombre));
  }
  const filas = Array.from(porId.values()).sort((a, b) => (b.ultimaActividad ?? b.creado).localeCompare(a.ultimaActividad ?? a.creado));
  const reales = filas.filter((f) => !f.prueba);
  const esReal = (userId: string | null) => !!userId && porId.get(userId)?.prueba === false;
  const deBilly = eventos.filter((e) => (e.nombre === 'billy_respuesta' || e.nombre === 'telegram_respuesta') && reciente(e.cuando) && esReal(e.userId));
  return {
    usuarios: reales.length,
    nuevos7d: reales.filter((f) => reciente(f.creado)).length,
    activos7d: reales.filter((f) => reciente(f.ultimaActividad)).length,
    onboarding: reales.filter((f) => f.onboardingCompleto).length,
    conArchivo: reales.filter((f) => f.archivos > 0).length,
    archivosConError7d: archivos.filter((a) => a.estado === 'error' && reciente(a.cuando) && esReal(a.userId)).length,
    preguntasBilly7d: deBilly.length,
    preguntasSospechosas7d: deBilly.filter((e) => e.sospechosa).length,
    filas,
    actividad: eventos.slice(0, 40).map((e) => {
      const f = e.userId ? porId.get(e.userId) : undefined;
      return { cuando: e.cuando, nombre: etiquetaEvento(e.nombre), email: f?.email ?? null, prueba: f?.prueba ?? false };
    }),
  };
}
