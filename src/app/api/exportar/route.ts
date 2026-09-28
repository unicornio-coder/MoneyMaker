import { contexto } from '@/lib/data/contexto';
import { categoria } from '@/lib/domain/categorias';
import { incluye, nivelPlan, TEXTO_LIMITE } from '@/lib/domain/plan';

/** CSV con todos los movimientos del usuario. */
export async function GET() {
  const { usuario, repo, perfil } = await contexto();
  if (!incluye(nivelPlan(perfil), 'exportar')) return Response.json({ codigo: 'limite_plan', mensaje: TEXTO_LIMITE.exportar }, { status: 402 });
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
