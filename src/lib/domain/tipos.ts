// Tipos del dominio. Espejo de las tablas de supabase/migrations/0001_init.sql.

export type TipoCuenta = 'credito' | 'debito' | 'inversion' | 'efectivo';
export type TipoMovimiento = 'gasto' | 'ingreso' | 'pago_tarjeta' | 'transferencia';
export type FuenteDato = 'belvo' | 'import' | 'gmail' | 'manual' | 'bitso';
export type TipoRecurrente = 'suscripcion' | 'servicio' | 'msi' | 'colegiatura' | 'otro';
export type Frecuencia = 'semanal' | 'quincenal' | 'mensual' | 'anual';
export type Periodo = 'q' | 'mes' | 'anio';

export type Categoria = {
  id: string;
  nombre: string;
  color: string;
  tipo: 'gasto' | 'ingreso' | 'transferencia';
  orden: number;
};

export type Cuenta = {
  id: string;
  linkId?: string | null;
  nombre: string;
  banco: string;
  bancoDominio?: string | null;
  tipo: TipoCuenta;
  ultimos4?: string | null;
  saldo: number;
  limite?: number | null;
  pagoMinimo?: number | null;
  fechaCorte?: string | null;
  fechaLimite?: string | null;
  color?: string | null;
  activo: boolean;
};

export type Movimiento = {
  id: string;
  cuentaId: string;
  /** ISO yyyy-mm-dd */
  fecha: string;
  descripcionRaw: string;
  comercio: string;
  comercioDominio?: string | null;
  /** Siempre positivo; el sentido lo da `tipo`. */
  monto: number;
  tipo: TipoMovimiento;
  categoriaId: string;
  categoriaFuente: 'regla' | 'proveedor' | 'llm' | 'usuario';
  esMsi: boolean;
  msiCuota?: number | null;
  msiTotal?: number | null;
  recurrenteId?: string | null;
  fuente: FuenteDato;
  hash: string;
};

export type Recurrente = {
  id: string;
  cuentaId?: string | null;
  nombre: string;
  comercioDominio?: string | null;
  tipo: TipoRecurrente;
  monto: number;
  diaCobro?: number | null;
  frecuencia: Frecuencia;
  primerCargo?: string | null;
  ultimoCargo?: string | null;
  veces: number;
  activo: boolean;
  canceladoAt?: string | null;
  msiCuotasTotal?: number | null;
  msiCuotasPagadas?: number | null;
  msiTermina?: string | null;
  categoriaId?: string | null;
  origen: 'detectado' | 'manual';
};

export type Presupuesto = {
  id: string;
  periodo: Periodo;
  inicio: string;
  fin: string;
  ingreso: number;
  lineas: LineaPresupuesto[];
};

export type LineaPresupuesto = {
  id: string;
  categoriaId: string;
  nombre?: string | null;
  limite: number;
  orden: number;
};

export type Activo = { id: string; tipo: 'casa' | 'auto' | 'inversion' | 'cripto' | 'efectivo' | 'otro'; nombre: string; valor: number; detalle: Record<string, unknown>; cuentaId?: string | null };
export type Pasivo = { id: string; tipo: 'tarjeta' | 'hipoteca' | 'auto' | 'personal' | 'otro'; nombre: string; saldo: number; tasa?: number | null; cuentaId?: string | null };
export type Objetivo = { id: string; grupo: 'ahorro' | 'deuda' | 'inversion'; nombre: string; meta: number; avance: number; fecha?: string | null; cuentaId?: string | null; completado: boolean };

export type Insight = {
  id: string;
  tipo: string;
  titulo: string;
  texto: string;
  monto?: number | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  leido: boolean;
  descartado: boolean;
  referencia: Record<string, unknown>;
  createdAt: string;
};

export type EventoCalendario = { id: string; fecha: string; nombre: string; monto?: number | null; tipo: 'cargo' | 'recordatorio' | 'pago'; recurrenteId?: string | null };

export type Perfil = {
  id: string;
  email: string;
  nombre?: string | null;
  diasPago: number[];
  ingresoQuincenal?: number | null;
  metas: string[];
  plan: 'trial' | 'premium' | 'vencido';
  trialTermina: string;
  onboardingCompleto: boolean;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  planRenueva?: string | null;
  planIntervalo?: 'mes' | 'anio' | null;
};

export type Credencial = { proveedor: 'gmail' | 'bitso'; etiqueta?: string | null; datos: Record<string, unknown>; updatedAt: string };

/** Movimiento tal como lo entrega una fuente antes de categorizar y deduplicar. */
export type MovimientoCrudo = {
  fecha: string;
  descripcion: string;
  monto: number;
  /** true si es abono/ingreso; false si es cargo. */
  esAbono: boolean;
  externalId?: string | null;
  categoriaProveedor?: string | null;
};
