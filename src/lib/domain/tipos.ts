// Tipos del dominio. Espejo de las tablas de supabase/migrations/0001_init.sql.

export type TipoCuenta = 'credito' | 'debito' | 'inversion' | 'efectivo';
export type TipoMovimiento = 'gasto' | 'ingreso' | 'pago_tarjeta' | 'transferencia';
export type FuenteDato = 'belvo' | 'import' | 'gmail' | 'outlook' | 'manual' | 'bitso' | 'dispositivo' | 'correo';
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
  /** Lo que el recibo dice y el banco no: "Secadora Remington · 1 de 6 MSI", "Roma Norte → Polanco · 22 min". */
  detalle?: string | null;
  /** Resumen del recibo casado (artículos, origen/destino, pedido). Nunca el correo completo. */
  recibo?: Record<string, unknown> | null;
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

export type Credencial = { proveedor: 'gmail' | 'outlook' | 'bitso' | 'dispositivo' | 'correo'; etiqueta?: string | null; datos: Record<string, unknown>; updatedAt: string };

/** Movimiento tal como lo entrega una fuente antes de categorizar y deduplicar. Monto en pesos. */
export type MovimientoCrudo = {
  fecha: string;
  descripcion: string;
  monto: number;
  /** true si es abono/ingreso; false si es cargo. */
  esAbono: boolean;
  externalId?: string | null;
  categoriaProveedor?: string | null;
  /** 0 la primera vez que aparece (fecha, descripción, monto) en el lote; 1, 2… para repetidos reales del mismo archivo. */
  repeticion?: number;
  /** La fuente (IA) cree que es una suscripción. */
  esPosibleSuscripcion?: boolean;
  /** Cuota/total si la fuente lo trae ya separado (sección de meses sin intereses). */
  msi?: { cuota: number; total: number } | null;
};

// ---------- Importación de estados de cuenta ----------

export type TipoCuentaEstado = 'credito' | 'debito' | 'inversion';

/** Movimiento normalizado por cualquier fuente de ingesta (PDF hoy; correo y Belvo mañana). Montos en centavos enteros MXN. */
export type MovimientoNormalizado = {
  fecha: string;
  descripcion: string;
  montoCentavos: number;
  esAbono: boolean;
  moneda: string;
  montoOriginalCentavos?: number | null;
  monedaOriginal?: string | null;
  esPosibleSuscripcion: boolean;
  razonSuscripcion?: string | null;
  msi?: { cuota: number; total: number } | null;
  /** Últimos 4 de la tarjeta adicional que hizo el cargo, si el estado lo distingue. */
  tarjetaUltimos4?: string | null;
};

/** Lo que el estado de cuenta dice de sí mismo. null cuando el documento no lo trae. */
export type ResumenEstado = {
  institucion: string | null;
  producto: string | null;
  tipoCuenta: TipoCuentaEstado | null;
  ultimos4: string | null;
  periodoInicio: string | null;
  periodoFin: string | null;
  fechaCorte: string | null;
  fechaLimitePago: string | null;
  pagoMinimoCentavos: number | null;
  saldoAlCorteCentavos: number | null;
  limiteCreditoCentavos: number | null;
  totalCargosCentavos: number | null;
  totalAbonosCentavos: number | null;
  tarjetasAdicionales: string[];
  esEstadoDeCuenta: boolean;
  paginas: number | null;
};

export type EstadoImportacion = 'subido' | 'procesando' | 'necesita_contraseña' | 'revisar' | 'confirmado' | 'descartado' | 'error';
/** En qué va el procesamiento mientras `estado === 'procesando'`. */
export type EtapaImportacion = 'subido' | 'leyendo' | 'extrayendo' | 'cuadrando' | 'listo';
export type Cuadre = 'ok' | 'sin_cuadre' | 'sin_resumen';
export type MetodoExtraccion = 'claude-pdf' | 'claude-texto' | 'reglas' | 'tabla';

export type Importacion = {
  id: string;
  archivo: string;
  archivoHash: string;
  tamanoBytes: number;
  estado: EstadoImportacion;
  metodo: MetodoExtraccion | null;
  resumen: ResumenEstado;
  movimientos: MovimientoNormalizado[];
  advertencias: string[];
  cuadre: Cuadre | null;
  cuentaId?: string | null;
  insertados: number;
  duplicados: number;
  tokensEntrada: number;
  tokensSalida: number;
  error?: string | null;
  etapa?: EtapaImportacion | null;
  /** 0–100 según la etapa. */
  progreso?: number;
  /** Milisegundos que tardó la lectura (para estimar las siguientes). */
  duracionMs?: number | null;
  createdAt: string;
  updatedAt: string;
};
