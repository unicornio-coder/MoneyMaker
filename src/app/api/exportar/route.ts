import { contexto } from '@/lib/data/contexto';
import { categoria } from '@/lib/domain/categorias';

/** CSV con todos los movimientos del usuario. */
export async function GET() {
  const { usuario, repo } = await contexto();
  const [movs, cuentas] = await Promise.all([repo.movimientos(usuario.id), repo.cuentas(usuario.id)]);
  const nombre = new Map(cuentas.map((c) => [c.id, c.nombre]));
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const filas = [
    ['fecha', 'cuenta', 'comercio', 'descripcion_banco', 'categoria', 'tipo', 'monto', 'msi', 'fuente'].join(','),
    ...movs.map((m) => [m.fecha, nombre.get(m.cuentaId) ?? '', m.comercio, m.descripcionRaw, categoria(m.categoriaId).nombre, m.tipo, m.tipo === 'ingreso' ? m.monto : -m.monto, m.esMsi ? `${m.msiCuota}/${m.msiTotal}` : '', m.fuente].map(esc).join(',')),
  ];
  return new Response('﻿' + filas.join('\n'), {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="moneymaker-movimientos.csv"` },
  });
}
