// Solo el catálogo de bancos (5 KB): lo usa comercios.ts y llega al cliente en Importar sin arrastrar comercios ni categorías.

import bancosJson from '../../../qa/entregables/bancos.json';

export type BancoCatalogo = {
  id: string;
  nombre: string;
  nombre_corto: string;
  tipo: string;
  color: string | null;
  dominio: string;
  formato_pdf: { tiene_contraseña: boolean; regla_contraseña: string | null; manda_pdf_por_correo: boolean; remitente: string | null };
};

export const BANCOS_CATALOGO: BancoCatalogo[] = (bancosJson as { bancos: BancoCatalogo[] }).bancos;

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
