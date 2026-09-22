// Catálogos que entrega Producto en qa/entregables (categorías con palabras clave, comercios con suscripción, bancos).
// Se leen tal cual; cuando lleguen las versiones definitivas no hay que tocar código.

import categoriasJson from '../../../qa/entregables/categorias.json';
import merchantsJson from '../../../qa/entregables/merchants.json';
import bancosJson from '../../../qa/entregables/bancos.json';
import type { ComercioConocido } from './comercios';

export type CategoriaCatalogo = { id: string; nombre: string; color_token: string; palabras_clave: string[]; ejemplos: string[]; excluir?: string[] };
export type ComercioCatalogo = {
  id: string;
  nombre: string;
  categoria: string;
  descriptores: string[];
  planes: { nombre: string; precio_mxn: number | null; fuente: string | null; fecha: string | null }[];
  periodicidad: string;
  url_cancelacion: string | null;
  pasos_cancelacion: string[];
  dificultad: string;
  requiere_llamada: boolean;
  dominio_logo: string;
  notas: string;
};
export type BancoCatalogo = {
  id: string;
  nombre: string;
  nombre_corto: string;
  tipo: string;
  color: string | null;
  dominio: string;
  formato_pdf: { tiene_contraseña: boolean; regla_contraseña: string | null; manda_pdf_por_correo: boolean; remitente: string | null };
};

export const CATEGORIAS_CATALOGO: CategoriaCatalogo[] = (categoriasJson as { categorias: CategoriaCatalogo[] }).categorias;
export const COMERCIOS_CATALOGO: ComercioCatalogo[] = (merchantsJson as { merchants: ComercioCatalogo[] }).merchants;
export const BANCOS_CATALOGO: BancoCatalogo[] = (bancosJson as { bancos: BancoCatalogo[] }).bancos;

/** Comercios del catálogo en el formato del diccionario interno (todos son suscripciones o servicios recurrentes). */
export const COMERCIOS_DESDE_CATALOGO: ComercioConocido[] = COMERCIOS_CATALOGO.flatMap((c) =>
  c.descriptores.map((patron) => ({
    patron: patron.toUpperCase(),
    nombre: c.nombre,
    dominio: c.dominio_logo,
    categoria: c.categoria,
    suscripcion: c.categoria === 'suscripciones',
    servicio: c.categoria === 'servicios',
    cancelarUrl: c.url_cancelacion ?? undefined,
  })),
);

const GASTO = new Set(['fijos', 'comida', 'super', 'transporte', 'online', 'entretenimiento', 'salud', 'servicios', 'suscripciones', 'msi', 'colegiaturas', 'comisiones', 'efectivo', 'viajes', 'hogar']);
const INGRESO = new Set(['nomina', 'ingreso', 'rendimiento']);

type Regla = { categoriaId: string; palabras: RegExp[]; excluir: RegExp[] };

function reglaDe(kw: string): RegExp {
  const limpio = kw
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9 *&/.\-+]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
  return new RegExp(`(^|[^A-Z0-9])${limpio}([^A-Z0-9]|$)`);
}

function compilar(filtro: Set<string>): Regla[] {
  return CATEGORIAS_CATALOGO.filter((c) => filtro.has(c.id) && c.palabras_clave.length).map((c) => ({
    categoriaId: c.id,
    palabras: [...c.palabras_clave].sort((a, b) => b.length - a.length).map(reglaDe),
    excluir: (c.excluir ?? []).map(reglaDe),
  }));
}

const REGLAS_GASTO = compilar(GASTO);
const REGLAS_INGRESO = compilar(INGRESO);

/** Categoría por palabras clave del catálogo (descripción ya normalizada). null si ninguna aplica. */
export function categoriaPorPalabrasClave(normalizada: string, sentido: 'cargo' | 'abono'): string | null {
  const reglas = sentido === 'cargo' ? REGLAS_GASTO : REGLAS_INGRESO;
  for (const r of reglas) {
    if (r.excluir.some((re) => re.test(normalizada))) continue;
    if (r.palabras.some((re) => re.test(normalizada))) return r.categoriaId;
  }
  return null;
}

/** Banco del catálogo por nombre o id (insensible a mayúsculas y acentos). */
export function bancoDelCatalogo(nombre: string): BancoCatalogo | null {
  const k = nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9+]/g, '');
  if (!k) return null;
  return (
    BANCOS_CATALOGO.find((b) => b.id === k || b.nombre_corto.toLowerCase().replace(/[^a-z0-9+]/g, '') === k) ??
    BANCOS_CATALOGO.find((b) => k.includes(b.nombre_corto.toLowerCase().replace(/[^a-z0-9+]/g, ''))) ??
    null
  );
}
