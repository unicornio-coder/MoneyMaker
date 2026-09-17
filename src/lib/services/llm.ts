// LLM (Claude Haiku) solo para dos cosas acotadas: categorizar comercios desconocidos y leer estados de cuenta en PDF.
// Sin ANTHROPIC_API_KEY todo devuelve null y el sistema sigue con reglas.

import Anthropic from '@anthropic-ai/sdk';
import type { MovimientoCrudo } from '@/lib/domain/tipos';

// Modelo económico por defecto para tareas acotadas (decisión del plan); se puede subir por env.
const MODELO = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';
const CATEGORIAS = ['fijos', 'comida', 'super', 'transporte', 'online', 'entretenimiento', 'salud', 'servicios', 'suscripciones', 'msi', 'colegiaturas', 'comisiones', 'efectivo', 'viajes', 'hogar', 'otros', 'nomina', 'ingreso', 'rendimiento', 'pago_tarjeta', 'transferencia', 'inversion'];

function cliente(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  return new Anthropic();
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

export type CategoriaLLM = { descripcion: string; comercio: string; dominio: string | null; categoria: string; suscripcion: boolean };

/** Categoriza descripciones desconocidas en lote. Devuelve null si no hay llave o falla. */
export async function categorizarConLLM(descripciones: string[]): Promise<CategoriaLLM[] | null> {
  const c = cliente();
  if (!c || !descripciones.length) return null;
  const unicas = Array.from(new Set(descripciones)).slice(0, 80);
  try {
    const res = await c.messages.create({
      model: MODELO,
      max_tokens: 4000,
      system: `Eres el categorizador de una app de finanzas personales en México. Recibes descripciones crudas de movimientos bancarios mexicanos (BBVA, Nu, Amex, Banorte…). Para cada una devuelve el nombre limpio del comercio, su dominio web principal si lo conoces (o null), la categoría y si es una suscripción recurrente.
Categorías permitidas: ${CATEGORIAS.join(', ')}.
Responde solo JSON: [{"descripcion":"...","comercio":"...","dominio":"...|null","categoria":"...","suscripcion":true|false}]`,
      messages: [{ role: 'user', content: JSON.stringify(unicas) }],
    });
    const texto = res.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
    const lista = extraerJson<CategoriaLLM[]>(texto);
    if (!Array.isArray(lista)) return null;
    return lista.filter((x) => x && typeof x.descripcion === 'string' && CATEGORIAS.includes(x.categoria));
  } catch {
    return null;
  }
}

/** Extrae movimientos del texto de un estado de cuenta en PDF. Devuelve null si no hay llave o falla. */
export async function extraerMovimientosDeTexto(texto: string, banco: string | null): Promise<MovimientoCrudo[] | null> {
  const c = cliente();
  if (!c) return null;
  const recorte = texto.length > 60_000 ? texto.slice(0, 60_000) : texto;
  try {
    const res = await c.messages
      .stream({
        model: MODELO,
        max_tokens: 16000,
      system: `Lees estados de cuenta bancarios de México${banco ? ` (${banco})` : ''} convertidos a texto y extraes TODOS los movimientos de la tabla de operaciones. Ignora resúmenes, totales, saldos, pagos mínimos y publicidad. Para cada movimiento: fecha ISO yyyy-mm-dd (usa el año del periodo del estado de cuenta), descripción tal cual, monto positivo, y esAbono=true si es un pago recibido/abono/depósito/ingreso y false si es un cargo/compra/retiro.
Responde solo JSON: [{"fecha":"yyyy-mm-dd","descripcion":"...","monto":123.45,"esAbono":false}]`,
        messages: [{ role: 'user', content: recorte }],
      })
      .finalMessage();
    const salida = res.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
    const lista = extraerJson<MovimientoCrudo[]>(salida);
    if (!Array.isArray(lista)) return null;
    return lista.filter((m) => m && /^\d{4}-\d{2}-\d{2}$/.test(String(m.fecha)) && typeof m.monto === 'number' && m.monto > 0 && typeof m.descripcion === 'string');
  } catch {
    return null;
  }
}
