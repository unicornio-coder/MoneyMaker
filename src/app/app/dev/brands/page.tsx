import { BANCOS_CATALOGO, COMERCIOS_CATALOGO } from '@/lib/domain/catalogo';
import { COMERCIOS } from '@/lib/domain/comercios';
import { normalizarDominio } from '@/lib/brands';
import { TableroMarcas, type MarcaVista } from '@/components/dev/TableroMarcas';

export const metadata = { title: 'Marcas · MoneyMaker' };
export const dynamic = 'force-dynamic';

/** Diagnóstico visual: todos los logos que usa el producto y de qué fuente salió cada uno. Solo para el equipo. */
export default function BrandsPage() {
  const vistos = new Set<string>();
  const marcas: MarcaVista[] = [];
  const agregar = (nombre: string, dominio: string, grupo: MarcaVista['grupo']) => {
    const d = normalizarDominio(dominio);
    if (!d || vistos.has(d)) return;
    vistos.add(d);
    marcas.push({ nombre, dominio: d, grupo });
  };
  for (const b of BANCOS_CATALOGO) agregar(b.nombre_corto, b.dominio, 'bancos');
  for (const m of COMERCIOS_CATALOGO) agregar(m.nombre, m.dominio_logo, 'suscripciones');
  for (const c of COMERCIOS) if (c.dominio) agregar(c.nombre, c.dominio, c.suscripcion ? 'suscripciones' : 'comercios');
  return <TableroMarcas marcas={marcas} />;
}
