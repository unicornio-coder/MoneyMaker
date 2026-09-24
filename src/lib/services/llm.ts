// Claude para dos tareas acotadas: leer estados de cuenta (PDF como documento o texto) y categorizar comercios
// desconocidos. Sin ANTHROPIC_API_KEY, `hayLLM()` es false y el sistema sigue con reglas.
// Nunca se registra en logs el contenido del documento ni de las descripciones.

import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import { ExtraccionSchema, type Extraccion } from './ingestion/esquema';
import { ErrorImportacion } from './ingestion/tipos';

const MODELO = process.env.ANTHROPIC_MODEL || 'claude-opus-5';
const CATEGORIAS = ['fijos', 'comida', 'super', 'transporte', 'online', 'entretenimiento', 'salud', 'servicios', 'suscripciones', 'msi', 'colegiaturas', 'comisiones', 'efectivo', 'viajes', 'hogar', 'otros', 'nomina', 'ingreso', 'rendimiento', 'pago_tarjeta', 'transferencia', 'inversion'];

export function hayLLM(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

function cliente(): Anthropic | null {
  if (!hayLLM()) return null;
  return new Anthropic({ maxRetries: 2, timeout: 240_000 });
}

function extraerJson<T>(texto: string): T | null {
  const inicio = texto.indexOf('[') >= 0 && (texto.indexOf('{') < 0 || texto.indexOf('[') < texto.indexOf('{')) ? texto.indexOf('[') : texto.indexOf('{');
  if (inicio < 0) return null;
  const fin = Math.max(texto.lastIndexOf(']'), texto.lastIndexOf('}'));
  try {
    return JSON.parse(texto.slice(inicio, fin + 1)) as T;
  } catch {
    return null;
  }
}

function textoDe(res: Anthropic.Message): string {
  return res.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
}

function traducirError(e: unknown): ErrorImportacion {
  if (e instanceof ErrorImportacion) return e;
  if (e instanceof Anthropic.RateLimitError) return new ErrorImportacion('limite_api');
  if (e instanceof Anthropic.BadRequestError) return new ErrorImportacion(/pdf|document|page/i.test(e.message) ? 'ilegible' : 'servidor', e.message);
  if (e instanceof Anthropic.APIConnectionError) return new ErrorImportacion('servidor', 'Sin conexión con el servicio de lectura');
  if (e instanceof Anthropic.APIError) return new ErrorImportacion('servidor', `${e.name} ${e.status ?? ''}`.trim());
  return new ErrorImportacion('servidor');
}

export type CategoriaLLM = { descripcion: string; comercio: string; dominio: string | null; categoria: string; suscripcion: boolean };

/** Categoriza descripciones desconocidas en lote. Devuelve null si no hay llave o falla. */
export async function categorizarConLLM(descripciones: string[]): Promise<CategoriaLLM[] | null> {
  const c = cliente();
  if (!c || !descripciones.length) return null;
  const unicas = Array.from(new Set(descripciones)).slice(0, 80);
  try {
    const res = await c.messages.create({
      model: MODELO,
      max_tokens: 8000,
      output_config: { effort: 'low' },
      system: `Eres el categorizador de una app de finanzas personales en México. Recibes descripciones crudas de movimientos bancarios mexicanos (BBVA, Nu, Amex, Banorte…). Para cada una devuelve el nombre limpio del comercio, su dominio web principal si lo conoces (o null), la categoría y si es una suscripción o membresía recurrente.
Categorías permitidas: ${CATEGORIAS.join(', ')}.
Responde solo JSON: [{"descripcion":"...","comercio":"...","dominio":"...|null","categoria":"...","suscripcion":true|false}]`,
      messages: [{ role: 'user', content: JSON.stringify(unicas) }],
    });
    const lista = extraerJson<CategoriaLLM[]>(textoDe(res));
    if (!Array.isArray(lista)) return null;
    return lista.filter((x) => x && typeof x.descripcion === 'string' && CATEGORIAS.includes(x.categoria));
  } catch (e) {
    console.warn('[llm] categorizar', e instanceof Error ? e.name : 'error');
    return null;
  }
}

const SISTEMA_ESTADO = `Lees estados de cuenta bancarios de México (tarjetas de crédito, cuentas de débito y nómina, casas de bolsa) y devuelves su contenido estructurado.
Reglas:
- Nunca inventes datos. Si un campo no aparece en el documento, devuelve null.
- Incluye TODOS los movimientos de la tabla de operaciones, uno por renglón, en el orden del documento. No incluyas resúmenes, totales, saldos, pagos mínimos, intereses proyectados ni publicidad como movimientos.
- Distingue bien: cargo (compra, retiro, comisión, interés) → esAbono=false; pago recibido, abono, depósito, devolución, reembolso, bonificación → esAbono=true.
- Los montos siempre positivos, en pesos mexicanos con dos decimales; el signo lo da esAbono.
- Fechas en formato yyyy-mm-dd. Si el renglón solo trae día y mes, usa el año del periodo del estado de cuenta.
- Si el documento tiene una sección de compras a meses sin intereses, toma de ahí la cuota y el total (msiCuota, msiTotal) de cada compra; si solo aparece en el texto como "03/12" o "cuota 3 de 12", úsalo también.
- Si hay tarjetas adicionales, lístalas en tarjetasAdicionales y, cuando el documento lo distinga, indica en cada movimiento con qué tarjeta se hizo.
- Cargos en otra moneda: monto es el equivalente en pesos que trae el documento; montoOriginal y monedaOriginal traen el original. Si no hay equivalente en pesos, monto=0 y deja el original.
- Marca esPosibleSuscripcion=true con una razón corta cuando el cargo parezca una membresía o servicio recurrente (streaming, música, apps, software, gimnasio, telefonía, seguros mensuales).
- Si el documento no es un estado de cuenta (recibo, ticket, factura, otra cosa), devuelve esEstadoDeCuenta=false y movimientos vacío.
Pistas por formato:
- American Express: el periodo aparece como "del … al …" o en el encabezado; "Nuevo saldo" o "Saldo total" es saldoAlCorte; "Total de cargos" y "Total de pagos y créditos" son los totales; un monto seguido de "CR" o entre paréntesis es abono; los cargos se agrupan por tarjeta (titular y adicionales, cada una con sus últimos dígitos); "Pago para no generar intereses" y "Pago mínimo" van en sus campos.
- BBVA, Banamex, Banorte, Santander, HSBC: la tabla trae fecha de operación y fecha de cargo (usa la de operación), columnas de cargos y abonos separadas; "Fecha de corte", "Fecha límite de pago", "Límite de crédito", "Pago mínimo" y "Pago para no generar intereses" están en el resumen de la primera página.
- Nu, Stori, Klar, Hey: estados sencillos de una o dos páginas; los pagos aparecen como "Pago recibido".
- Cuentas de débito y nómina: tipoCuenta=debito; depósitos de nómina y transferencias recibidas son abonos; saldoAlCorte es el saldo final del periodo.`;

type EntradaLLM = { pdf?: Buffer | null; texto?: string | null };

function contenidoDe(entrada: EntradaLLM): Anthropic.ContentBlockParam[] {
  const bloques: Anthropic.ContentBlockParam[] = [];
  if (entrada.pdf) bloques.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: entrada.pdf.toString('base64') } });
  else if (entrada.texto) bloques.push({ type: 'text', text: `Texto del estado de cuenta (extraído del PDF):\n\n${entrada.texto.slice(0, 250_000)}` });
  bloques.push({ type: 'text', text: 'Extrae el resumen y todos los movimientos de este estado de cuenta.' });
  return bloques;
}

/** Lee un estado de cuenta con Claude. Reintenta una vez si el JSON no valida; después lanza ErrorImportacion. */
export async function extraerEstadoDeCuenta(entrada: EntradaLLM): Promise<{ extraccion: Extraccion; tokens: { entrada: number; salida: number } }> {
  const c = cliente();
  if (!c) throw new ErrorImportacion('servidor', 'Sin ANTHROPIC_API_KEY');
  if (!entrada.pdf && !entrada.texto) throw new ErrorImportacion('ilegible');

  const tokens = { entrada: 0, salida: 0 };
  let ultimoError: string | null = null;
  for (let intento = 0; intento < 2; intento++) {
    let res: Anthropic.Message;
    try {
      res = await c.messages
        .stream({
          model: MODELO,
          max_tokens: 48_000,
          system: SISTEMA_ESTADO,
          messages: [{ role: 'user', content: contenidoDe(entrada) }],
          output_config: { effort: 'medium', format: zodOutputFormat(ExtraccionSchema) },
        })
        .finalMessage();
    } catch (e) {
      throw traducirError(e);
    }
    tokens.entrada += res.usage.input_tokens;
    tokens.salida += res.usage.output_tokens;
    if (res.stop_reason === 'refusal') throw new ErrorImportacion('servidor', 'El servicio de lectura rechazó el documento');
    if (res.stop_reason === 'max_tokens') throw new ErrorImportacion('ilegible', 'El documento es demasiado largo para leerlo completo');

    const crudo = extraerJson<unknown>(textoDe(res));
    const parsed = ExtraccionSchema.safeParse(crudo);
    if (parsed.success) return { extraccion: parsed.data, tokens };
    ultimoError = parsed.error.issues.slice(0, 3).map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
  }
  throw new ErrorImportacion('servidor', `La lectura no devolvió un JSON válido dos veces (${ultimoError ?? 'sin detalle'})`);
}

// ---------- Recibos sin parser ----------

const ReciboSchema = z.object({
  esRecibo: z.boolean().describe('true si el correo es un recibo o confirmación de compra, viaje o pedido con un total pagado; false si es promoción, envío sin monto u otra cosa'),
  comercio: z.string().nullable().describe('Nombre corto del comercio o app: Amazon, Uber, Rappi, Mercado Libre, DiDi, Walmart, Liverpool…; null si no se identifica'),
  dominio: z.string().nullable().describe('Dominio principal del comercio (amazon.com.mx, uber.com); null si no lo sabes'),
  total: z.number().nullable().describe('Total pagado en pesos mexicanos con dos decimales; null si no aparece'),
  fecha: z.string().nullable().describe('Fecha de la compra o viaje en formato yyyy-mm-dd; null si no aparece'),
  detalle: z.string().describe('Una línea de máximo 60 caracteres con lo esencial: artículo principal y MSI, o "origen → destino · minutos", o "restaurante · N artículos"'),
  articulos: z.array(z.string()).describe('Artículos o platillos comprados, uno por elemento, sin precios; lista vacía si no aplica'),
  origen: z.string().nullable().describe('Origen del viaje si es transporte; null si no'),
  destino: z.string().nullable().describe('Destino del viaje si es transporte; null si no'),
  msi: z.number().nullable().describe('Número de meses sin intereses si la compra fue a meses; null si no'),
  descriptores: z.array(z.string()).describe('2 a 4 palabras en mayúsculas con las que ese comercio aparece en un estado de cuenta bancario mexicano, p. ej. ["AMAZON","AMZN"], ["UBER"], ["MERCADOPAGO","MELI"]'),
});
export type ReciboLLM = z.infer<typeof ReciboSchema>;

const SISTEMA_RECIBO = `Lees correos de recibos y confirmaciones de compra de México (tiendas en línea, apps de transporte, comida a domicilio, servicios) y devuelves lo esencial estructurado. Nunca inventes datos: si un campo no aparece, devuelve null. El total es lo que se pagó, no el subtotal ni el envío por separado. El detalle es una sola línea, sin precios, en español.`;

/** Lee un recibo que ningún parser reconoció. Devuelve null sin llave, si no es recibo o si el modelo falla. */
export async function extraerReciboConLLM(correo: { from: string; subject: string; text: string }): Promise<ReciboLLM | null> {
  const c = cliente();
  if (!c) return null;
  try {
    const res = await c.messages
      .stream({
        model: MODELO,
        max_tokens: 2000,
        system: SISTEMA_RECIBO,
        messages: [{ role: 'user', content: `Remitente: ${correo.from.slice(0, 120)}\nAsunto: ${correo.subject.slice(0, 200)}\n\n${correo.text.slice(0, 12_000)}` }],
        output_config: { effort: 'low', format: zodOutputFormat(ReciboSchema) },
      })
      .finalMessage();
    if (res.stop_reason !== 'end_turn') return null;
    const parsed = ReciboSchema.safeParse(extraerJson<unknown>(textoDe(res)));
    if (!parsed.success || !parsed.data.esRecibo || !parsed.data.total || !parsed.data.comercio) return null;
    return parsed.data;
  } catch (e) {
    console.warn('[llm] recibo', e instanceof Error ? e.name : 'error');
    return null;
  }
}
