// Repositorio: la única puerta de las pantallas y del pipeline a los datos.
// Dos implementaciones: memoria (modo mock / demo) y Supabase (producción). Misma interfaz.

import type { Activo, Credencial, Cuenta, EventoCalendario, Importacion, Insight, LineaPresupuesto, Movimiento, Objetivo, Pasivo, Perfil, Periodo, Presupuesto, Recurrente } from '@/lib/domain/tipos';

export type Link = {
  id: string;
  proveedor: 'belvo' | 'gmail' | 'import' | 'manual' | 'bitso';
  externalId?: string | null;
  institucion: string;
  institucionDominio?: string | null;
  estado: 'ok' | 'mfa' | 'roto' | 'pendiente';
  ultimoSync?: string | null;
};

export type NuevoMovimiento = Omit<Movimiento, 'id'>;
export type NuevoRecurrente = Omit<Recurrente, 'id'>;
export type NuevoInsight = Omit<Insight, 'id' | 'leido' | 'descartado' | 'createdAt'> & { clave: string };

export type FiltroMovimientos = {
  desde?: string;
  hasta?: string;
  cuentaId?: string;
  categoriaId?: string;
  tipo?: Movimiento['tipo'];
  limite?: number;
};

export interface Repo {
  // Perfil
  perfil(userId: string): Promise<Perfil | null>;
  guardarPerfil(userId: string, cambios: Partial<Omit<Perfil, 'id'>> & { email?: string }): Promise<Perfil>;

  // Fuentes y cuentas
  links(userId: string): Promise<Link[]>;
  guardarLink(userId: string, link: Omit<Link, 'id'> & { id?: string }): Promise<Link>;
  eliminarLink(userId: string, linkId: string): Promise<void>;
  cuentas(userId: string): Promise<Cuenta[]>;
  cuenta(userId: string, cuentaId: string): Promise<Cuenta | null>;
  guardarCuenta(userId: string, cuenta: Omit<Cuenta, 'id'> & { id?: string; externalId?: string | null }): Promise<Cuenta>;
  eliminarCuenta(userId: string, cuentaId: string): Promise<void>;

  // Movimientos
  movimientos(userId: string, filtro?: FiltroMovimientos): Promise<Movimiento[]>;
  /** Inserta ignorando duplicados por hash. Devuelve los insertados. */
  insertarMovimientos(userId: string, movs: NuevoMovimiento[]): Promise<Movimiento[]>;
  actualizarMovimiento(userId: string, id: string, cambios: Partial<Pick<Movimiento, 'categoriaId' | 'categoriaFuente' | 'comercio' | 'tipo' | 'esMsi' | 'msiCuota' | 'msiTotal' | 'recurrenteId'>>): Promise<Movimiento | null>;
  eliminarMovimiento(userId: string, id: string): Promise<void>;

  // Comercios corregidos por el usuario (patron → categoría)
  correccionesComercio(userId: string): Promise<{ patron: string; nombre: string; dominio: string | null; categoriaId: string; esSuscripcion: boolean }[]>;
  guardarCorreccionComercio(userId: string, c: { patron: string; nombre: string; dominio: string | null; categoriaId: string; esSuscripcion: boolean }): Promise<void>;

  // Recurrentes
  recurrentes(userId: string): Promise<Recurrente[]>;
  /** Concilia los detectados con los existentes (misma cuenta+nombre+tipo). No toca los manuales ni los cancelados. */
  conciliarRecurrentes(userId: string, detectados: (NuevoRecurrente & { movimientoIds: string[] })[]): Promise<Recurrente[]>;
  guardarRecurrente(userId: string, r: NuevoRecurrente & { id?: string }): Promise<Recurrente>;
  eliminarRecurrente(userId: string, id: string): Promise<void>;
  crearSolicitudCancelacion(userId: string, recurrenteId: string, notas?: string): Promise<{ id: string }>;

  // Presupuesto
  presupuesto(userId: string, periodo: Periodo, inicio: string): Promise<Presupuesto | null>;
  guardarPresupuesto(userId: string, p: { periodo: Periodo; inicio: string; fin: string; ingreso: number; lineas: Omit<LineaPresupuesto, 'id'>[] }): Promise<Presupuesto>;
  actualizarLineaPresupuesto(userId: string, presupuestoId: string, categoriaId: string, limite: number): Promise<void>;

  // Patrimonio y objetivos
  activos(userId: string): Promise<Activo[]>;
  guardarActivo(userId: string, a: Omit<Activo, 'id'> & { id?: string }): Promise<Activo>;
  eliminarActivo(userId: string, id: string): Promise<void>;
  pasivos(userId: string): Promise<Pasivo[]>;
  guardarPasivo(userId: string, p: Omit<Pasivo, 'id'> & { id?: string }): Promise<Pasivo>;
  eliminarPasivo(userId: string, id: string): Promise<void>;
  objetivos(userId: string): Promise<Objetivo[]>;
  guardarObjetivo(userId: string, o: Omit<Objetivo, 'id'> & { id?: string }): Promise<Objetivo>;
  eliminarObjetivo(userId: string, id: string): Promise<void>;

  // Insights y calendario
  insights(userId: string): Promise<Insight[]>;
  /** Inserta solo los que no existan ya por clave (referencia.clave). */
  guardarInsights(userId: string, lista: NuevoInsight[]): Promise<Insight[]>;
  marcarInsight(userId: string, id: string, cambios: { leido?: boolean; descartado?: boolean }): Promise<void>;
  eventos(userId: string, desde: string, hasta: string): Promise<EventoCalendario[]>;
  guardarEvento(userId: string, e: Omit<EventoCalendario, 'id'> & { id?: string }): Promise<EventoCalendario>;
  eliminarEvento(userId: string, id: string): Promise<void>;

  // Credenciales de conectores (cifradas) y eventos de producto
  credencial(userId: string, proveedor: Credencial['proveedor']): Promise<Credencial | null>;
  guardarCredencial(userId: string, c: Omit<Credencial, 'updatedAt'>): Promise<void>;
  eliminarCredencial(userId: string, proveedor: Credencial['proveedor']): Promise<void>;
  registrarEvento(userId: string | null, nombre: string, props?: Record<string, unknown>): Promise<void>;

  // Importaciones de estados de cuenta (un registro por archivo; el archivo nunca se guarda)
  importaciones(userId: string, filtro?: { estados?: Importacion['estado'][] }): Promise<Importacion[]>;
  importacion(userId: string, id: string): Promise<Importacion | null>;
  importacionPorHash(userId: string, archivoHash: string): Promise<Importacion | null>;
  guardarImportacion(userId: string, imp: Omit<Importacion, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<Importacion>;
  eliminarImportacion(userId: string, id: string): Promise<void>;
  /** Descripciones que ninguna regla reconoció (y lo que dijo el modelo), para mejorar el catálogo. */
  registrarDescriptoresSinCategoria(userId: string, lista: { descriptor: string; comercioLlm?: string | null; categoriaLlm?: string | null }[]): Promise<void>;

  // Compatibilidad: bitácora simple de archivos (tabla statements)
  registrarEstadoDeCuenta(userId: string, s: { cuentaId?: string | null; archivo: string; banco?: string | null; estado: 'subido' | 'procesado' | 'error'; transacciones: number; error?: string | null }): Promise<{ id: string }>;
}
